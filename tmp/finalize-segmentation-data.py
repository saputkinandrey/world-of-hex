import json
from pathlib import Path
p=Path('godot/modules/character-animation-workbench/masks/segmentation-landmarks.json');d=json.loads(p.read_text())
d['boundaries']={
'south':[{'bone':'ArmL','pixel':[36,36]},{'bone':'Head','pixel':[38,36]},{'bone':'Head','pixel':[54,52]},{'bone':'Chest','pixel':[54,54]}],
'north':[{'bone':'Head','pixel':[39,31]},{'bone':'Chest','pixel':[55,39]},{'bone':'ArmL','pixel':[28,43]}],
'south-west':[{'bone':'Head','pixel':[64,64]},{'bone':'ArmL','pixel':[57,56]},{'bone':'Head','pixel':[86,51]},{'bone':'Chest','pixel':[73,69]},{'bone':'ForearmR','pixel':[90,94]}],
'north-west':[{'bone':'Head','pixel':[62,60]},{'bone':'Chest','pixel':[69,61]},{'bone':'ForearmL','pixel':[65,80]},{'bone':'ForearmR','pixel':[89,85]}]}
p.write_text(json.dumps(d,indent=2)+'\n')
p=Path('tmp/animation-workbench/segmentation/after/components.json');data=json.loads(p.read_text())
for view,d in data.items(): print(view,'extras',[(b,[c['pixels'] for c in cs]) for b,cs in d['four_neighbors'].items() if len(cs)!=1])
Path('godot/modules/character-animation-workbench/masks/segmentation-components.json').write_text(p.read_text())
