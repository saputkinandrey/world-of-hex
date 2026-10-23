"""Validate partial Neural frames without pretending Unknown is animated."""
import hashlib
import json
import subprocess
from PIL import Image, ImageChops


def validate(folder):
    manifest = json.loads((folder/'manifest.json').read_text())
    frames = sorted((folder/'sequence').glob('frame-*.png'))
    if len(frames) != 293 or manifest['clips']['sequence'] != 293:
        raise ValueError('Neural diagnostic frame count differs from the unchanged comparison sequence')
    names = ['South','North','SouthWest','NorthWest']
    poses = [set() for _ in names]
    threshold = [0 if value<=15 else 255 for value in range(256)]
    for index,path in enumerate(frames):
        if path.name != f'frame-{index:04d}.png':
            raise ValueError('Missing Neural diagnostic frame: '+str(index))
        with Image.open(path) as image:
            if image.size != (2048,512):
                raise ValueError('Inconsistent Neural frame dimensions: '+str(path))
            image = image.convert('RGB')
            background = image.getpixel((0,0))
            for column in range(4):
                panel = image.crop((column*512,80,column*512+512,512))
                mask = ImageChops.difference(panel,Image.new('RGB',panel.size,background)).convert('L').point(threshold)
                bounds = mask.getbbox()
                if not bounds or bounds[0]<=2 or bounds[2]>=510 or bounds[1]<=0 or bounds[3]>=430:
                    raise ValueError('Empty or clipped Neural diagnostic: '+str((index,column,bounds)))
                poses[column].add(hashlib.sha256(panel.tobytes()).hexdigest())
    results = {}
    for name,values in zip(names,poses):
        known = manifest['known_pixels'][name]
        if known and len(values)<2:
            raise ValueError('Known Neural chunks do not move: '+name)
        results[name] = {'known_pixels':known,'distinct_frames':len(values),
                         'animation':'measured' if known else 'NOT MEASURABLE: no independently owned chunks; static Unknown display'}
    (folder/'frame-validation.json').write_text(json.dumps(results,indent=2)+'\n')
    return manifest


def encode(folder):
    verified = [(folder/mode,validate(folder/mode)) for mode in ('chunks','texture')]
    for path,manifest in verified:
        subprocess.run(['ffmpeg','-y','-hide_banner','-loglevel','error','-framerate',str(manifest['fps']),
            '-i',str(path/'sequence/frame-%04d.png'),'-c:v','libx264','-crf','18','-pix_fmt','yuv420p',
            '-movflags','+faststart',str(path/('neural-'+path.name+'.mp4'))],check=True)
