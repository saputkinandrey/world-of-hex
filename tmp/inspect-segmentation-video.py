import json,subprocess
from pathlib import Path
from PIL import Image,ImageDraw
root=Path('godot/modules/character-animation-workbench')
for view in ['south','north','south-west','north-west']:
 p=root/'rigs'/f'{view}-rig.tscn'
 baseline=subprocess.check_output(['git','show','HEAD:'+p.as_posix()])
 # bind_rigs only reorders ext_resource declarations; restore that cosmetic delta.
 current=p.read_text();old=baseline.decode('utf-8')
 assert sorted(current.splitlines())==sorted(old.splitlines()),p
 p.write_bytes(baseline)
out=Path('tmp/animation-workbench/segmentation')
for mode in ['chunks','texture']:
 sheet=Image.new('RGB',(4*370,8*390),(27,31,38));draw=ImageDraw.Draw(sheet)
 for row,frame in enumerate([0,19,37,53,80,105,126,154]):
  source=Image.open(out/mode/'sequence'/f'frame-{frame:04d}.png')
  for col in range(4):
   panel=source.crop((col*512+85,80,col*512+425,430)).resize((340,350),Image.Resampling.NEAREST)
   sheet.paste(panel,(col*370,row*390+30));draw.text((col*370+10,row*390+8),f'{["S","N","SW","NW"][col]} frame {frame}',fill='white')
 sheet.save(out/(mode+'-contact-sheet.png'))
