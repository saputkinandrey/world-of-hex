from pathlib import Path
import hashlib
import json
import subprocess
from PIL import Image, ImageChops

root = Path(__file__).resolve().parent / 'run'
manifest = json.loads((root / 'manifest.json').read_text())
for clip, count in manifest['clips'].items():
    frames = sorted((root / clip).glob('frame-*.png'))
    assert len(frames) == count
    hashes = set()
    for index, frame in enumerate(frames):
        assert frame.name == f'frame-{index:04d}.png'
        with Image.open(frame) as image:
            assert list(image.size) == manifest['size']
            rgb = image.convert('RGB')
            crop = rgb.crop((100, 80, 410, 430))
            background = Image.new('RGB', crop.size, rgb.getpixel((0, 0)))
            diff = ImageChops.difference(crop, background)
            assert sum(max(pixel) > 30 for pixel in diff.get_flattened_data()) > 2000
            hashes.add(hashlib.sha256(crop.tobytes()).hexdigest())
    assert len(hashes) >= 15
    print(f'Validated {clip}: {count} frames, {len(hashes)} poses', flush=True)

for clip in manifest['clips']:
    subprocess.run(['ffmpeg', '-y', '-hide_banner', '-loglevel', 'error',
                    '-framerate', '30', '-i', str(root / clip / 'frame-%04d.png'),
                    '-filter_complex', '[0:v]split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=sierra2_4a',
                    '-loop', '0', str(root / f'{clip}.gif')], check=True)
    with Image.open(root / f'{clip}.gif') as gif:
        duration = sum((gif.seek(i), gif.info.get('duration', 0))[1] for i in range(gif.n_frames))
        assert abs(duration - manifest['clips'][clip] / 30 * 1000) < 30
        print(f'GIF {clip}: {gif.n_frames} frames, {duration} ms', flush=True)

subprocess.run(['ffmpeg', '-y', '-hide_banner', '-loglevel', 'error',
                '-framerate', '30', '-i', str(root / 'sequence' / 'frame-%04d.png'),
                '-c:v', 'libx264', '-crf', '18', '-pix_fmt', 'yuv420p',
                '-movflags', '+faststart', str(root / 'south-run-transitions.mp4')], check=True)
print('Encoded South run transitions MP4', flush=True)
