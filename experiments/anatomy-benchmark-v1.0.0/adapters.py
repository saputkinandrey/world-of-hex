"""Narrow official inference adapters; no model architecture implementations."""
from pathlib import Path
import subprocess
import sys
import time

import numpy as np
from PIL import Image

from common import ROOT, read, measured, sha

SAM_LABELS = ['hair','headwear','face','eyes','eyewear','ears','earwear','nose','mouth','neck','neckwear','topwear','handwear','bottomwear','legwear','footwear','tail','wings','objects']
SAPIENS_LABELS = ['Background','Apparel','Eyeglass','Face_Neck','Hair','Left_Foot','Left_Hand','Left_Lower_Arm','Left_Lower_Leg','Left_Shoe','Left_Sock','Left_Upper_Arm','Left_Upper_Leg','Lower_Clothing','Right_Foot','Right_Hand','Right_Lower_Arm','Right_Lower_Leg','Right_Shoe','Right_Sock','Right_Upper_Arm','Right_Upper_Leg','Torso','Upper_Clothing','Lower_Lip','Upper_Lip','Lower_Teeth','Upper_Teeth','Tongue']


def side_groups(labels):
    return {part:{side:[i for i,name in labels.items() if name.lower().startswith(side) and part in name.lower()] for side in ['left','right']}
            for part in ['upper_arm','lower_arm','upper_leg','lower_leg']}


def schp():
    import onnxruntime as ort
    receipt = read(ROOT/'checkpoints.json')['schp']
    path = Path(receipt['path'])/receipt['file']
    options = ort.SessionOptions()
    options.intra_op_num_threads = 8
    model, load_metrics = measured(lambda: ort.InferenceSession(str(path), options, providers=['CPUExecutionProvider']))
    labels = dict(enumerate(['Background','Head','Torso','Upper_Arms','Lower_Arms','Upper_Legs','Lower_Legs']))

    def infer(image):
        values = np.array(image).astype(np.float32)/255
        values = (values-np.array([0.406,0.456,0.485],dtype=np.float32))/np.array([0.225,0.224,0.229],dtype=np.float32)
        outputs = model.run(None, {'pixel_values':values.transpose(2,0,1)[None]})
        named = {output.name: value[0] for output,value in zip(model.get_outputs(),outputs)}
        return {'class_map':named['logits'].argmax(axis=0).astype(np.int16),'labels':labels,'background_id':0,'raw':named}

    return infer, {'checkpoint':receipt,'backend':'ONNX Runtime CPU','onnxruntime':ort.__version__, 'dtype':'INT8 static',
                   'number_of_classes':7,'load_metrics':load_metrics,'groups':{part:{'both':[index]} for part,index in [('upper_arm',3),('lower_arm',4),('upper_leg',5),('lower_leg',6)]},
                   'preprocessing':'Official RGB /255 and BGR-indexed RGB mean/std; benchmark NN/Bicubic resize replaces default bilinear.'}, False


def sam():
    import torch
    from accelerate import init_empty_weights
    config = read(ROOT/'config.json')
    tooling = Path(config['tooling'])
    upstream = tooling/'see-through-windows/see-through'
    sys.path[:0] = [str(upstream),str(upstream/'common')]
    from modules.semanticsam import SemanticSam
    spec = config['seethrough-sam']
    checkpoint = tooling/'cache/huggingface/hub/models--24yearsold--l2d_sam_iter2/snapshots'/spec['revision']/spec['file']

    def load():
        state = torch.load(checkpoint,map_location='cpu',weights_only=True,mmap=True)
        if 'state_dict' in state:
            state = state['state_dict']
        with init_empty_weights(include_buffers=False):
            model = SemanticSam(class_num=19,model_type='h_hq')
        model.load_state_dict(state,strict=True,assign=True)
        return model.to(device='cuda',dtype=torch.bfloat16).eval()

    model, load_metrics = measured(load,True)
    labels = dict(enumerate(SAM_LABELS))

    def infer(image):
        with torch.inference_mode():
            output = model.inference(np.array(image))[0]
            logits = output.float().cpu().numpy()
        ids = np.arange(19,dtype=np.int16)[:,None,None]
        return {'class_map':np.where(logits>0,ids,-1).astype(np.int16),'multilabel':True,
                'labels':labels,'background_id':-1,'raw':{'logits':logits}}

    return infer, {'checkpoint':dict(spec,path=str(checkpoint),sha256=sha(checkpoint)), 'backend':'PyTorch CUDA',
                   'torch':torch.__version__,'cuda':torch.version.cuda,'dtype':'bfloat16','number_of_classes':19,
                   'gpu':torch.cuda.get_device_name(),'load_metrics':load_metrics,'groups':{},
                   'preprocessing':'Official internal bilinear resize 512->1024, RGB 0..255 normalization, logits returned in 512 input coordinates.',
                   'semantics':'Independent class logits thresholded at 0 per official notebook. No anatomical arm/leg subdivisions.'}, True


def sapiens():
    import torch
    from transformers import AutoImageProcessor, Sapiens2ForSemanticSegmentation
    receipt = read(ROOT/'checkpoints.json')['sapiens2']
    path = receipt['path']
    processor = AutoImageProcessor.from_pretrained(path,local_files_only=True)

    def load():
        model, info = Sapiens2ForSemanticSegmentation.from_pretrained(path,local_files_only=True,dtype=torch.float16,attn_implementation='sdpa',output_loading_info=True)
        if any(info.get(key) for key in ['missing_keys','unexpected_keys','mismatched_keys','error_msgs']):
            raise ValueError(f'Sapiens2 checkpoint did not load exactly: {info}')
        return model.to('cuda').eval()

    model, load_metrics = measured(load,True)
    labels = dict(enumerate(SAPIENS_LABELS))

    def infer(image):
        # Input is already at the official 768x1024 size in the specified interpolation.
        batch = processor(images=image,do_resize=False,return_tensors='pt').to('cuda',torch.float16)
        with torch.inference_mode():
            logits = model(**batch).logits[0]
            probabilities = logits.softmax(dim=0).cpu().numpy()
            values = logits.cpu().numpy()
        return {'class_map':values.argmax(axis=0).astype(np.int16),'labels':labels,'background_id':0,
                'raw':{'logits':values,'probabilities':probabilities}}

    return infer, {'checkpoint':receipt, 'backend':'PyTorch CUDA','dtype':'float16','torch':torch.__version__,
                   'cuda':torch.version.cuda,'number_of_classes':29,'gpu':torch.cuda.get_device_name(),
                   'load_metrics':load_metrics,'groups':side_groups(labels),
                   'preprocessing':'Official Sapiens2ImageProcessor normalization, target 1024x768. External NN/Bicubic resize; no second resize. SDPA; no architecture changes.'}, True


def bodypix():
    config = read(ROOT/'config.json')
    counter = [0]

    def infer(image):
        directory = ROOT/'bodypix/work'/str(counter[0])
        directory.mkdir(parents=True,exist_ok=False)
        counter[0] += 1
        image.save(directory/'input.png')
        with (directory/'node.log').open('w',encoding='utf-8') as log:
            completed = subprocess.run(['node',str(ROOT/'bodypix.cjs'),str(directory)],stdout=log,stderr=subprocess.STDOUT)
        if completed.returncode:
            raise RuntimeError((directory/'node.log').read_text(encoding='utf-8'))
        metadata = read(directory/'result.json')
        values = np.fromfile(directory/'classes.bin',dtype=np.int16).reshape(metadata['height'],metadata['width'])
        return {'class_map':values,'labels':{int(k):v for k,v in metadata['labels'].items()},'background_id':-1,
                'worker_metrics':metadata,'raw':{}}

    return infer, {'backend':'TensorFlow.js CPU','dtype':'float32','number_of_classes':24,
                   'checkpoint':'MobileNetV1 multiplier=0.75 outputStride=16 quantBytes=4',
                   'groups':side_groups(dict(enumerate(['left_face','right_face','left_upper_arm_front','left_upper_arm_back','right_upper_arm_front','right_upper_arm_back','left_lower_arm_front','left_lower_arm_back','right_lower_arm_front','right_lower_arm_back','left_hand','right_hand','torso_front','torso_back','left_upper_leg_front','left_upper_leg_back','right_upper_leg_front','right_upper_leg_back','left_lower_leg_front','left_lower_leg_back','right_lower_leg_front','right_lower_leg_back','left_feet','right_feet']))),
                   'preprocessing':'Official BodyPix, internalResolution=full, segmentationThreshold=0.7, no horizontal flip; 512 square input, internal valid stride size is logged.'}, False


def load_model(key):
    if key=='densepose':
        from densepose_adapter import load
        return load()
    return {'schp':schp,'bodypix':bodypix,'seethrough-sam':sam,'sapiens2':sapiens}[key]()
