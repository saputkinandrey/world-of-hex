import json
from pathlib import Path
p=Path('godot/modules/character-animation-workbench/masks')
d=json.loads((p/'authored-segmentation.json').read_text())
for view in d['views']:
 print(view,[(r['bone'],r['polygon']) for r in d['views'][view] if 'Arm' in r['bone'] or 'Forearm' in r['bone']])
f=json.loads(Path('tmp/animation-workbench/segmentation/after/components.json').read_text());print(str(f)[:2200])
