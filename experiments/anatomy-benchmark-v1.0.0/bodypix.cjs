/* Official body-segmentation BodyPix API, headless Node CPU execution. */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const {performance} = require('perf_hooks');
const {PNG} = require('pngjs');
const tf = require('@tensorflow/tfjs');

// The official wrapper constructs ImageData and checks ImageBitmap even for a
// Tensor3D input. These containers provide those Node-missing platform types.
global.ImageBitmap = class ImageBitmap {};
global.ImageData = class ImageData {
  constructor(data, width, height) {
    if (data.length !== width * height * 4) throw new Error('Invalid RGBA container');
    this.data = data;
    this.width = width;
    this.height = height;
  }
};
const segmentation = require('@tensorflow-models/body-segmentation');
const config = JSON.parse(fs.readFileSync(path.join(__dirname,'config.json'),'utf8'));
const root = path.join(config.model_root,'bodypix','mobilenet-float-075-stride16');
const modelURL = 'https://storage.googleapis.com/tfjs-models/savedmodel/bodypix/mobilenet/float/075/model-stride16.json';

async function download() {
  fs.mkdirSync(root,{recursive:true});
  const manifestFile = path.join(root,'model-stride16.json');
  if (!fs.existsSync(manifestFile)) {
    const response = await fetch(modelURL);
    if (!response.ok) throw new Error(`${response.status}: ${modelURL}`);
    fs.writeFileSync(manifestFile,Buffer.from(await response.arrayBuffer()));
  }
  const manifest = JSON.parse(fs.readFileSync(manifestFile,'utf8'));
  const files = ['model-stride16.json'];
  for (const group of manifest.weightsManifest) {
    for (const name of group.paths) {
      const target = path.join(root,name);
      if (!fs.existsSync(target)) {
        const url = new URL(name,modelURL).href;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`${response.status}: ${url}`);
        fs.writeFileSync(target,Buffer.from(await response.arrayBuffer()));
      }
      files.push(name);
    }
  }
  const receipt = {url:modelURL,files:files.map(name=>({name,bytes:fs.statSync(path.join(root,name)).size,
    sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,name))).digest('hex')}))};
  fs.mkdirSync(path.join(__dirname,'bodypix'),{recursive:true});
  fs.writeFileSync(path.join(__dirname,'bodypix','checkpoint.json'),JSON.stringify(receipt,null,2));
  console.log('Official BodyPix graph and shards cached.');
}

async function main() {
  if (process.argv[2] === '--download') return download();
  const directory = process.argv[2];
  await tf.setBackend('cpu');
  await tf.ready();
  const manifest = JSON.parse(fs.readFileSync(path.join(root,'model-stride16.json'),'utf8'));
  tf.io.registerLoadRouter(url => url === 'bodypix-local://mobilenet' ? {load:async()=>{
    const specs = [];
    const buffers = [];
    for (const group of manifest.weightsManifest) {
      specs.push(...group.weights);
      for (const name of group.paths) buffers.push(fs.readFileSync(path.join(root,name)));
    }
    const buffer = Buffer.concat(buffers);
    return {modelTopology:manifest.modelTopology,weightSpecs:specs,
      weightData:buffer.buffer.slice(buffer.byteOffset,buffer.byteOffset+buffer.byteLength)};
  }} : null);
  let start = performance.now();
  const segmenter = await segmentation.createSegmenter(segmentation.SupportedModels.BodyPix,
    {architecture:'MobileNetV1',outputStride:16,multiplier:0.75,quantBytes:4,modelUrl:'bodypix-local://mobilenet'});
  const loadSeconds = (performance.now()-start)/1000;
  const image = PNG.sync.read(fs.readFileSync(path.join(directory,'input.png')));
  const values = new Int32Array(image.width*image.height*3);
  for (let i=0;i<image.width*image.height;i++) for (let c=0;c<3;c++) values[i*3+c]=image.data[i*4+c];
  const tensor = tf.tensor3d(values,[image.height,image.width,3],'int32');
  const options = {segmentBodyParts:true,multiSegmentation:false,flipHorizontal:false,
    internalResolution:'full',segmentationThreshold:0.7};
  start = performance.now();
  await segmenter.segmentPeople(tensor,options);
  const warmupSeconds = (performance.now()-start)/1000;
  start = performance.now();
  const result = await segmenter.segmentPeople(tensor,options);
  if (result.length !== 1) throw new Error(`Expected one part segmentation, got ${result.length}`);
  const mask = await result[0].mask.toImageData();
  const inferenceSeconds = (performance.now()-start)/1000;
  const classes = new Int16Array(mask.width*mask.height);
  for (let i=0;i<classes.length;i++) classes[i] = mask.data[i*4+3]===0 ? -1 : mask.data[i*4];
  fs.writeFileSync(path.join(directory,'classes.bin'),Buffer.from(classes.buffer));
  const labels = {};
  for (let i=0;i<24;i++) labels[i]=result[0].maskValueToLabel(i);
  fs.writeFileSync(path.join(directory,'result.json'),JSON.stringify({width:mask.width,height:mask.height,labels,
    node:process.version,tfjs:tf.version.tfjs,body_segmentation:require('@tensorflow-models/body-segmentation/package.json').version,
    backend:tf.getBackend(),options,load_seconds:loadSeconds,warmup_seconds:warmupSeconds,inference_seconds:inferenceSeconds,
    internal_model_resolution:[513,513],ram_rss_bytes:process.memoryUsage().rss,ram_lifetime_peak_bytes:process.resourceUsage().maxRSS*1024,
    probabilities:'Not exposed by the public segmentPeople part-mask API. Raw native IDs preserved.'},null,2));
  tensor.dispose();
  segmenter.dispose();
}
main().catch(error=>{console.error(error.stack);process.exitCode=1;});
