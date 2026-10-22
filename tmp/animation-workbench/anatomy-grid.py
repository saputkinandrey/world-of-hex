from pathlib import Path
from PIL import Image, ImageDraw
import sys
sys.path.insert(0,str(Path('godot/modules/character-animation-workbench/tools').resolve()))
import deformation_masks as m
for view in ['south-west','north-west']:
    folder,name=m.ASSETS[view]
    im=Image.open(m.PROJECT/'assets/Character/Character1/idle'/folder/name).convert('RGBA')
    im=im.crop((0,0,im.height,im.height)).resize((900,900),Image.Resampling.NEAREST)
    bg=Image.new('RGBA',im.size,'#242830'); bg.alpha_composite(im)
    d=ImageDraw.Draw(bg)
    for p in range(0,150,5):
        d.line((p*6,0,p*6,900),fill=(255,0,0,60),width=1)
        d.line((0,p*6,900,p*6),fill=(255,0,0,60),width=1)
        for q in range(30,125,10):d.text((p*6,q*6),str(p)+','+str(q),fill='white')
    bg.save('tmp/animation-workbench/'+view+'-grid.png')
