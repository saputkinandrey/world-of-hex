import json
from pathlib import Path
base=Path('tmp/animation-workbench/segmentation')
a=json.loads((base/'after/components.json').read_text());b=json.loads((base/'before/components.json').read_text())
for v in a:
 print(v,'pixels',sum(c['pixels'] for cs in a[v]['four_neighbors'].values() for c in cs),'before extras',sum(max(0,len(cs)-1) for cs in b[v]['four_neighbors'].values()),'after',sum(max(0,len(cs)-1) for cs in a[v]['four_neighbors'].values()))
 print(' '.join(f'{bone}:{cs[0]["pixels"]}' for bone,cs in a[v]['four_neighbors'].items()))
