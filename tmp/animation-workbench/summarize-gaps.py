import json,collections
j=json.load(open('tmp/animation-workbench/motion-gaps-before.json'))
names=['Pelvis','Spine','Chest','Head','ArmL','ForearmL','ArmR','ForearmR','ThighL','CalfL','ThighR','CalfR']
for p,d in j['profiles'].items():
 groups=collections.defaultdict(list)
 for e in d['edges']: groups[tuple(sorted((e['a'],e['b'])))].append(e)
 print('\n',p)
 for pair,es in groups.items():
  e=max(es,key=lambda e:e['max_gap'])
  print('/'.join(names[x] for x in pair),len(es),'max',round(e['max_gap'],2),'at',e['x'],e['y'],e['dx'],e['dy'],e['clip'],round(e['time'],3),'bounds',min(z['x'] for z in es),min(z['y'] for z in es),max(z['x'] for z in es),max(z['y'] for z in es))
