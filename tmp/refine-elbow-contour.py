import json
from pathlib import Path
p=Path('godot/modules/character-animation-workbench/masks/authored-segmentation.json');d=json.loads(p.read_text())
r=next(r for r in d['views']['north-west'] if r['bone']=='ForearmL');r['polygon']=[[49,76],[68,76],[67,81],[65,86],[62,94],[61,99],[55,105],[47,104],[46,95],[49,88]]
r=next(r for r in d['views']['north-west'] if r['bone']=='ForearmR');r['polygon'][-1]=[87,80]
p.write_text(json.dumps(d,indent=2)+'\n')
p=Path('godot/modules/character-animation-workbench/masks/segmentation-landmarks.json');d=json.loads(p.read_text());print(d.keys());print(str(d)[:300])
