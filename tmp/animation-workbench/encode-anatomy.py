from pathlib import Path
import hashlib
import json
import subprocess
from PIL import Image, ImageChops

root = Path(__file__).resolve().parent / 'comparison-anatomy'
manifest = json.loads((root / 'manifest.json').read_text())
frames = sorted((root / 'sequence').glob('frame-*.png'))
assert len(frames) == manifest['clips']['sequence'] == 293
poses = [set() for _ in range(4)]
threshold = [0 if value <= 15 else 255 for value in range(256)]
for index, frame in enumerate(frames):
    assert frame.name == f'frame-{index:04d}.png'
    with Image.open(frame) as image:
        assert list(image.size) == manifest['size'] == [2048, 512]
        rgb = image.convert('RGB')
        for side in range(4):
            crop = rgb.crop((side*512+100, 80, side*512+410, 430))
            background = Image.new('RGB', crop.size, rgb.getpixel((0,0)))
            difference = ImageChops.difference(crop, background)
            mask = difference.convert('L').point(threshold)
            assert mask.histogram()[255] > 2000
            panel = rgb.crop((side*512, 80, (side+1)*512, 512))
            bounds = ImageChops.difference(panel, Image.new('RGB', panel.size, rgb.getpixel((0,0)))).convert('L').point(threshold).getbbox()
            assert bounds and bounds[0] > 2 and bounds[2] < 510 and bounds[1] > 0 and bounds[3] < 430
            poses[side].add(hashlib.sha256(crop.tobytes()).hexdigest())
assert min(map(len, poses)) > 100
print(f'Validated {len(frames)} 2048x512 frames; distinct poses S/N/SW/NW: {list(map(len, poses))}', flush=True)
subprocess.run(['ffmpeg', '-y', '-hide_banner', '-loglevel', 'error',
                '-framerate', str(manifest['fps']), '-i', str(root / 'sequence/frame-%04d.png'),
                '-c:v', 'libx264', '-crf', '18', '-pix_fmt', 'yuv420p',
                '-movflags', '+faststart', str(root / 'anatomical-masks-comparison.mp4')], check=True)
print('Encoded synchronized S/N/SW/NW comparison', flush=True)
