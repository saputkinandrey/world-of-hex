from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[2] / 'godot/assets/Character/Character1/idle/Char1_north_idle'
body = Image.open(root / 'Char1_body_back.png').convert('RGBA')
shirt = Image.open(root / 'Char1_back_stand_shirts.png').convert('RGBA')
print('RGBA examples', body.getpixel((22, 30)), shirt.getpixel((220+22, 30)))
for shift in [8, 7, 6.667, 6, 5, 4, 3, 2, 1, 0]:
    count = 0
    for y in range(33, 65):
        for x in range(110):
            covered = shirt.getpixel((220+x, round(y-shift)))[3]
            if body.getpixel((x,y))[3] > 128 and covered < 250:
                count += 1
    print('shirt relative y', shift, 'exposed torso pixels', count)
for y in [30, 32, 35, 40, 45, 50, 55, 60]:
    b = [x for x in range(110) if body.getpixel((x,y))[3] > 128]
    s = [x for x in range(110) if shirt.getpixel((220+x,y-7))[3] > 128]
    print('row',y,'body', (min(b),max(b)) if b else None, 'shirt',(min(s),max(s)) if s else None)

render = Path(__file__).resolve().parent / 'north-layers'
full = Image.open(render / 'rig-full.png').convert('RGBA')
off = Image.open(render / 'rig-without-body.png').convert('RGBA')
for y in range(215, 320, 5):
    changes = [(x, yy) for yy in range(y,y+5) for x in range(140,375)
               if max(abs(full.getpixel((x,yy))[i])-off.getpixel((x,yy))[i] for i in range(3)) > 2]
    print('render band',y,'changed',len(changes), 'x bounds', (min(p[0] for p in changes),max(p[0] for p in changes)) if changes else None)
