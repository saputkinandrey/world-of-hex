import json,collections
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw
root=Path('tmp/animation-workbench')
summary=[]
for frame in range(293):
 a=np.array(Image.open(root/'comparison-ligaments/sequence'/f'frame-{frame:04d}.png').convert('RGB')).astype('int16')
 b=np.array(Image.open(root/'comparison-motion-bridges/sequence'/f'frame-{frame:04d}.png').convert('RGB')).astype('int16')
 for side in range(4):
  left,right=side*512+110,side*512+400
  old=np.max(abs(a[120:438,left:right]-a[0,0]),axis=2)>2
  new=np.max(abs(b[120:438,left:right]-b[0,0]),axis=2)>2
  summary.append({'frame':frame,'side':side,'filled':int(np.sum(~old&new)),'lost':int(np.sum(old&~new))})
(root/'motion-pixel-delta.json').write_text(json.dumps(summary))
print('filled screen pixels by view',[(s,sum(d['filled'] for d in summary if d['side']==s),max(d['filled'] for d in summary if d['side']==s)) for s in range(4)])
for side in range(4):
 cases=sorted([d for d in summary if d['side']==side],key=lambda d:d['filled'],reverse=True)[:4]
 print(side,cases)
 sheet=Image.new('RGB',(1240,960),(24,28,34));draw=ImageDraw.Draw(sheet)
 for k,d in enumerate(cases):
  f=d['frame'];x=(k%2)*620;y=(k//2)*480
  draw.text((x+5,y+5),f'{["S","N","SW","NW"][side]} frame {f}: before / after; filled {d["filled"]}',fill='white')
  for j,folder in enumerate(['comparison-ligaments','comparison-motion-bridges']):
   im=Image.open(root/folder/'sequence'/f'frame-{f:04d}.png')
   sheet.paste(im.crop((side*512+110,120,side*512+400,438)),(x+j*310,y+35))
 sheet.save(root/f'gap-proof-{side}.png')
