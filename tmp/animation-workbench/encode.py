from pathlib import Path
from PIL import Image, ImageChops
import subprocess

root = Path(__file__).resolve().parent / 'renders'
for clip, count in [('idle_breathe', 100), ('weapon_swing', 70)]:
    directory = root / clip
    paths = sorted(directory.glob('frame-*.png'))
    assert len(paths) == count, (clip, len(paths))
    assert [p.name for p in paths] == [f'frame-{i:04d}.png' for i in range(count)]
    first = Image.open(paths[0]).convert('RGB')
    changed = 0
    for path in paths:
        frame = Image.open(path).convert('RGB')
        assert frame.size == (512, 512), path
        bounds = ImageChops.difference(frame, Image.new('RGB', frame.size, frame.getpixel((0, 0)))).getbbox()
        assert bounds and bounds[0] > 0 and bounds[1] > 0 and bounds[2] < 512 and bounds[3] < 512, (path, bounds)
        changed += ImageChops.difference(first, frame).getbbox() is not None
    assert changed > count // 2, (clip, changed)
    print(f'Verified {clip}: {count} complete frames, 512x512, visible unclipped character, {changed} moving frames', flush=True)

for clip in ['idle_breathe', 'weapon_swing']:
    input_path = str(root / clip / 'frame-%04d.png')
    common = ['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-framerate', '50', '-i', input_path]
    subprocess.run(common + ['-filter_complex', '[0:v]split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=sierra2_4a', '-loop', '0', str(root / f'{clip}.gif')], check=True)
    subprocess.run(common + ['-c:v', 'libx264', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', str(root / f'{clip}.mp4')], check=True)
    print(f'Encoded {clip}.gif and {clip}.mp4', flush=True)
