import json
from pathlib import Path
p=Path('godot/modules/character-animation-workbench/masks/authored-segmentation.json');d=json.loads(p.read_text())
for view,bone,points,reason in [('south','ArmL',[[36,34],[37,34],[37,35],[37,36]],'Shoulder crest outside the skull contour'),('south','ArmR',[[72,34],[73,34],[74,34],[72,35],[73,35],[72,36],[73,36],[72,37],[72,38],[71,40],[70,42]],'Shoulder crest outside the skull contour'),('south','Head',[[38,38],[71,39],[39,40],[70,41],[40,42]],'Preserve the dark jaw contour on its own chunk'),('south-west','Head',[[86,50],[86,51],[86,52]],'Outer ear pixels follow the head')]:
 d['pixel_corrections'][view].append({'bone':bone,'reason':reason,'pixels':points})
p.write_text(json.dumps(d,indent=2)+'\n')
