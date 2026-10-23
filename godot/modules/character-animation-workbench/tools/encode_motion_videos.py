"""Check every rendered frame before encoding either motion comparison."""
import hashlib
import json
import subprocess
from pathlib import Path

from PIL import Image, ImageChops

OUTPUT = Path(__file__).resolve().parents[4] / 'tmp/animation-workbench'
VIDEOS = [
    ('comparison-expressive-resources', 'expressive-four-directions.mp4', 293, 1),
    ('comparison-bounce-amplitudes', 'bounce-2-3-4.mp4', 120, 3),
]
THRESHOLD = [0 if value <= 15 else 255 for value in range(256)]


def verify(folder, count, rows):
    manifest = json.loads((folder/'manifest.json').read_text())
    assert manifest['clips']['sequence'] == count
    assert manifest['directions'] == ['S','N','SW','NW']
    if rows == 1:
        assert len(set(manifest['sources'])) == 4
    else:
        assert manifest['amplitudes'] == [2,3,4]
    frames = sorted((folder/'sequence').glob('frame-*.png'))
    assert len(frames) == count, (folder,len(frames),count)
    poses = [set() for _ in range(4*rows)]
    for index,frame in enumerate(frames):
        assert frame.name == f'frame-{index:04d}.png'
        with Image.open(frame) as image:
            assert list(image.size) == manifest['size'] == [2048,512*rows]
            image = image.convert('RGB')
            for row in range(rows):
                for column in range(4):
                    x,y = column*512,row*512
                    crop = image.crop((x+100,y+80,x+410,y+430))
                    background = image.getpixel((0,y))
                    mask = ImageChops.difference(crop,Image.new('RGB',crop.size,background)).convert('L').point(THRESHOLD)
                    assert mask.histogram()[255] > 2000, (index,row,column,'empty sprite')
                    panel = image.crop((x,y+80,x+512,y+512))
                    bounds = ImageChops.difference(panel,Image.new('RGB',panel.size,background)).convert('L').point(THRESHOLD).getbbox()
                    assert bounds and bounds[0] > 2 and bounds[2] < 510 and bounds[1] > 0 and bounds[3] < 430, (index,row,column,'clipped sprite',bounds)
                    poses[row*4+column].add(hashlib.sha256(crop.tobytes()).hexdigest())
    assert min(map(len,poses)) >= (100 if rows == 1 else 18), list(map(len,poses))
    print(f'Validated {count} frames in {folder.name}; distinct poses: {list(map(len,poses))}',flush=True)
    return manifest


def main():
    verified = [(OUTPUT/name,filename,verify(OUTPUT/name,count,rows)) for name,filename,count,rows in VIDEOS]
    for folder,filename,manifest in verified:
        subprocess.run(['ffmpeg','-y','-hide_banner','-loglevel','error',
                        '-framerate',str(manifest['fps']),'-i',str(folder/'sequence/frame-%04d.png'),
                        '-c:v','libx264','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',str(folder/filename)],check=True)
        print('Encoded '+str(folder/filename),flush=True)


if __name__ == '__main__':
    main()
