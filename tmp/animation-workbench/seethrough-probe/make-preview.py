from PIL import Image,ImageDraw
from pathlib import Path
import json,sys
out=Path('tmp/animation-workbench/seethrough-probe')
mode=sys.argv[1];root=out/'results'/mode/f'south-west-{mode}-512'
sheet=Image.new('RGB',(2048,1100),(28,32,39));draw=ImageDraw.Draw(sheet)
items=[('Input',out/'model-inputs'/f'south-west-{mode}-512.png'),('Reviewed ownership',out/'baseline/south-west-owners.png')]+[(name,root/(name+'.png')) for name in ['head','handwear','topwear','bottomwear','legwear','footwear']]
rows=[]
for i,(name,path) in enumerate(items):
 image=Image.open(path).convert('RGBA')
 if image.size!=(512,512):image=image.resize((512,512),Image.Resampling.NEAREST)
 bg=Image.new('RGBA',(512,512));g=ImageDraw.Draw(bg)
 for y in range(0,512,16):
  for x in range(0,512,16):g.rectangle((x,y,x+15,y+15),fill=(55,60,68,255) if (x//16+y//16)%2 else (75,80,88,255))
 bg.alpha_composite(image)
 x,y=(i%4)*512,(i//4)*550
 sheet.paste(bg.convert('RGB'),(x,y+35));draw.text((x+8,y+8),name,fill='white')
 if i>=2:
  hist=image.getchannel('A').histogram();rows.append({'layer':name,'alpha_gt_15':sum(hist[16:]),'alpha_gt_128':sum(hist[129:]),'alpha_range':image.getchannel('A').getextrema()})
sheet.save(out/(mode+'-layers.png'))
(out/(mode+'-layer-coverage.json')).write_text(json.dumps(rows,indent=2)+'\n')
