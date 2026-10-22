from pathlib import Path
from PIL import Image
import json
base=Path('godot/modules/character-animation-workbench/masks')
m=json.loads((base/'profiles.json').read_text())
palette={tuple(c):i for i,c in enumerate(m['bones'].values())}
o=Image.open(base/'south-west-0-owners.png').convert('RGB')
r=Image.open(base/'south-west-0-rigidity.png').convert('L')
s=Image.open('godot/assets/Character/Character1/idle/Char1_south_west_idle/Idle_body_SW1.png').convert('RGBA')
print('x=82..101; digits=bone, lower=soft; 6/7=right upper/forearm, A/B=right thigh/calf')
for y in range(68,108):
 print(y,''.join((('0123456789AB'[palette[o.getpixel((x,y))]] if r.getpixel((x,y))==255 else 'abcdefghijkl'[palette[o.getpixel((x,y))]]) if s.getpixel((x,y))[3]>128 else '.') for x in range(82,102)))
