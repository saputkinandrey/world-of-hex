from pathlib import Path
import hashlib
import json
import subprocess
from PIL import Image, ImageChops

root = Path(__file__).resolve().parent / 'comparison-three'
manifest = json.loads((root / 'manifest.json').read_text())
frames = sorted((root / 'sequence').glob('frame-*.png'))
assert len(frames) == manifest['clips']['sequence'] == 293
poses = [set(), set(), set()]
for index, frame in enumerate(frames):
    assert frame.name == f'frame-{index:04d}.png'
    with Image.open(frame) as image:
        assert list(image.size) == manifest['size'] == [1536, 512]
        rgb = image.convert('RGB')
        for side in range(3):
            crop = rgb.crop((side*512+100, 80, side*512+410, 430))
            background = Image.new('RGB', crop.size, rgb.getpixel((0,0)))
            difference = ImageChops.difference(crop, background)
            assert sum(max(pixel) > 30 for pixel in difference.get_flattened_data()) > 2000
            poses[side].add(hashlib.sha256(crop.tobytes()).hexdigest())
assert min(map(len, poses)) > 100
print(f'Validated {len(frames)} 1536x512 frames; distinct poses S/N/SW: {list(map(len, poses))}', flush=True)
subprocess.run(['ffmpeg', '-y', '-hide_banner', '-loglevel', 'error',
                '-framerate', str(manifest['fps']), '-i', str(root / 'sequence/frame-%04d.png'),
                '-c:v', 'libx264', '-crf', '18', '-pix_fmt', 'yuv420p',
                '-movflags', '+faststart', str(root / 'south-north-sw-comparison.mp4')], check=True)
print('Encoded synchronized S/N/SW comparison', flush=True)
