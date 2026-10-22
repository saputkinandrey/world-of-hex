from pathlib import Path
from PIL import Image, ImageChops
import subprocess

root = Path(__file__).resolve().parent / 'deformation'
for example in ['body', 'white', 'blue']:
    files = sorted((root/example).glob('frame-*.png'))
    assert [p.name for p in files] == [f'frame-{i:04d}.png' for i in range(60)], example
    first = Image.open(files[0]).convert('RGB')
    moving = 0
    for path in files:
        frame = Image.open(path).convert('RGB')
        assert frame.size == (512,512), path
        background = Image.new('RGB',frame.size,frame.getpixel((0,0)))
        bounds = ImageChops.difference(background,frame).getbbox()
        assert bounds and bounds[0]>0 and bounds[1]>0 and bounds[2]<512 and bounds[3]<512, (path,bounds)
        moving += ImageChops.difference(first,frame).getbbox() is not None
    assert moving >= 55, (example,moving)
    print(f'Verified {example}: 60 complete 512x512 frames, {moving} moving, character visible and unclipped',flush=True)

inputs=[]
for example in ['body','white','blue']:
    inputs += ['-framerate','30','-i',str(root/example/'frame-%04d.png')]
common=['ffmpeg','-hide_banner','-loglevel','error','-y']+inputs
stack='[0:v][1:v][2:v]hstack=inputs=3'
subprocess.run(common+['-filter_complex',stack,'-c:v','libx264','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',str(root/'skeletal-deformation.mp4')],check=True)
subprocess.run(common+['-filter_complex',stack+'[s];[s]split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=sierra2_4a','-loop','0',str(root/'skeletal-deformation.gif')],check=True)
with Image.open(root/'skeletal-deformation.gif') as gif:
    assert gif.n_frames == 60 and gif.size == (1536,512)
print('Encoded and verified skeletal-deformation.mp4 and .gif',flush=True)
