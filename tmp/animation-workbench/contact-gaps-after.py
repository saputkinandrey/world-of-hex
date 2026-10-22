from pathlib import Path
from PIL import Image, ImageDraw
root=Path('tmp/animation-workbench')
frames=sorted((root/'comparison-motion-bridges/sequence').glob('frame-*.png'))
out=root/'gap-inspection-after'
out.mkdir(exist_ok=True)
for start in range(0,len(frames),16):
 sheet=Image.new('RGB',(1984,672),(30,34,40)); draw=ImageDraw.Draw(sheet)
 for k,p in enumerate(frames[start:start+16]):
  x,y=(k%4)*496,(k//4)*168
  draw.text((x+4,y+2),f'frame {start+k:03d} | t={(start+k)/30:.3f}s | S / N / SW / NW',fill='white')
  with Image.open(p) as src:
   for side in range(4):
    panel=src.crop((side*512+100,112,side*512+400,462)).resize((120,140),Image.Resampling.NEAREST)
    sheet.paste(panel,(x+side*124,y+22))
 sheet.save(out/f'sheet-{start//16:02d}.png')
print(f'{len(frames)} frames, {len(list(out.glob("sheet-*.png")))} contact sheets')

