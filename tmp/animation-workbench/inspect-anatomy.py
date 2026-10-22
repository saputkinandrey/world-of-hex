from pathlib import Path
from PIL import Image, ImageDraw
import sys
sys.path.insert(0, str(Path('godot/modules/character-animation-workbench/tools').resolve()))
import deformation_masks as masks

sheet = Image.new('RGB', (1350, 1450), '#242830')
draw = ImageDraw.Draw(sheet)
for row, (view, (folder, name)) in enumerate(masks.ASSETS.items()):
    body = Image.open(masks.PROJECT/'assets/Character/Character1/idle'/folder/name).convert('RGBA')
    body = body.crop((0, 0, body.height, body.height))
    owners = Image.open(masks.MASKS/f'{view}-0-owners.png').convert('RGBA')
    owners.putalpha(body.getchannel('A'))
    rigid = Image.open(masks.MASKS/f'{view}-0-rigidity.png').convert('RGBA')
    for col, image in enumerate([body, owners, rigid]):
        image = image.resize((body.width*3, body.height*3), Image.Resampling.NEAREST)
        y = row*350+20
        sheet.paste(image, (col*450,y), image)
        draw.text((col*450,y), view+' '+['source','owners','rigidity'][col],fill='white')
        for tick in range(0,body.height,10):
            draw.text((col*450+tick*3,y+body.height*3-12),str(tick),fill='red')
            draw.text((col*450,y+tick*3),str(tick),fill='red')
sheet.save('tmp/animation-workbench/anatomy-before.png')
