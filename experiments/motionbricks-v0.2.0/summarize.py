"""Summarize measured outputs and validate complete GL frame sets before encoding."""
import csv
import json
import subprocess
import numpy as np
from PIL import Image
from paths import ROOT, OUTPUT_ROOT
OUT=ROOT/'results'

def read(name): return json.loads((OUT/name).read_text(encoding='utf-8-sig'))

def summarize():
    fp32,fp16=read('benchmark-fp32.json'),read('benchmark-fp16.json')
    memory={}
    for name in ['once','loop','verify','benchmark','fp16']:
        path=ROOT/'logs'/f'{name}-gpu.csv'
        rows=list(csv.reader(path.read_text(encoding='utf-8-sig').splitlines()))
        used=[int(row[1].strip().split()[0]) for row in rows if len(row)>=3]
        memory[name]=dict(samples=len(used),device_vram_min_mib=min(used),device_vram_max_mib=max(used))
    a=np.load(OUT/'fp32-sample.npz')['poses']
    b=np.load(OUT/'fp16-sample.npz')['poses']
    comparison=dict(fp32_shape=list(a.shape),fp16_shape=list(b.shape))
    if a.shape==b.shape:
        difference=np.linalg.norm(a[:,0,:3]-b[:,0,:3],axis=1)
        comparison.update(max_root_trajectory_difference_m=float(difference.max()),mean_root_trajectory_difference_m=float(difference.mean()))
    report=dict(memory=memory,precision_comparison=comparison,wall_speedup_fp16=fp32['median_wall_ms']/fp16['median_wall_ms'],inference_speedup_fp16=fp32['median_inference_gpu_ms']/fp16['median_inference_gpu_ms'])
    (OUTPUT_ROOT/'results/summary.json').write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps(report,indent=2))


def videos():
    for name,count in [('inbetweener',120),('scene-preview',420)]:
        folder=OUT/name
        frames=sorted(folder.glob('frame-*.png'))
        if len(frames)!=count: raise ValueError(f'{name}: incomplete frames')
        for i,path in enumerate(frames):
            if path.name!=f'frame-{i:05d}.png': raise ValueError('Missing or out-of-order frame')
            with Image.open(path) as image:
                if image.size!=(960,640) or image.mode!='RGB': raise ValueError(f'Wrong frame: {path}')
        for index in [0,count//3,count//2,count-1]:
            pixels=np.array(Image.open(frames[index]))
            if pixels.std()<10 or pixels.max()<100: raise ValueError(f'Blank render: {frames[index]}')
        destination=OUTPUT_ROOT/'results'/name
        destination.mkdir(parents=True,exist_ok=True)
        output=destination/'demo.mp4'
        if output.exists(): raise FileExistsError(f'Refusing to overwrite video: {output}')
        subprocess.run(['ffmpeg','-hide_banner','-loglevel','warning','-n','-framerate','30','-i',str(folder/'frame-%05d.png'),'-frames:v',str(count),'-c:v','libx264','-crf','18','-pix_fmt','yuv420p',str(output)],check=True)
        print(f'Encoded verified {name}: {count} frames, {count/30:.1f} s, 960x640, 30 FPS')

if __name__=='__main__':
    summarize()
    videos()
