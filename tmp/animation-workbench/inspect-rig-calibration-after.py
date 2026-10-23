from pathlib import Path
import sys,json,re
from PIL import Image,ImageDraw
module=Path('godot/modules/character-animation-workbench');sys.path.insert(0,str(module/'tools'))
from deformation_masks import ASSETS,PALETTE,BONES
manifest=json.loads((module/'masks/profiles.json').read_text());canvas=Image.new('RGB',(1800,970),(25,30,36));draw=ImageDraw.Draw(canvas)
for col,(view,(folder,file)) in enumerate(ASSETS.items()):
 profile=manifest['bindings'][view]['Layers/BodyBase'];w,h=manifest['profiles'][profile]['frame']
 source=Image.open(Path('godot/assets/Character/Character1/idle')/folder/file).convert('RGBA').crop((0,0,w,h))
 text=(module/'rigs'/f'{view}-rig.tscn').read_text();positions={};parents={}
 for block in text.split('[node ')[1:]:
  if 'type="Bone2D"' not in block.split(']')[0]:continue
  name=re.search(r'name="([^"]+)"',block)[1];parent=re.search(r'parent="([^"]+)"',block)[1].split('/')[-1]
  xy=re.search(r'position = Vector2\(([^,]+), ([^)]+)\)',block);px,py=map(float,xy.groups());base=positions.get(parent,(0,0));positions[name]=(base[0]+px,base[1]+py);parents[name]=parent
 base=Image.new('RGBA',(w,h),(25,30,36,255));base.alpha_composite(source)
 rgb=base.convert('RGB').resize((w*3,h*3),Image.Resampling.NEAREST);d=ImageDraw.Draw(rgb)
 def pixel(name):
  x,y=positions[name];return ((x+w/2)*3,(y+h/2)*3)
 for name,parent in parents.items():
  p=pixel(name)
  if parent in positions:d.line([pixel(parent),p],fill=(255,0,0),width=2)
  d.ellipse((p[0]-3,p[1]-3,p[0]+3,p[1]+3),fill=(255,0,0))
 x=col*450+(450-w*3)//2;canvas.paste(rgb,(x,35));draw.text((col*450+10,10),view+' | calibrated rest joints',fill='white')
 owners=Image.open(module/'masks'/f'{profile}-owners.png').convert('RGB');mask=Image.blend(base.convert('RGB'),owners,.5);mask.putalpha(source.getchannel('A'));bg=Image.new('RGBA',(w,h),(25,30,36,255));bg.alpha_composite(mask)
 canvas.paste(bg.convert('RGB').resize((w*3,h*3),Image.Resampling.NEAREST),(x,505));draw.text((col*450+10,480),'Current ownership masks',fill='white')
canvas.save('tmp/animation-workbench/rig-calibration-after.png')
print('Saved rest-joint and ownership baseline for S/N/SW/NW. No source files changed.')
