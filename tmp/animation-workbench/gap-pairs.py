import json,collections
j=json.load(open('tmp/animation-workbench/motion-gaps-before.json'))
print('samples',j['samples'])
for p,d in j['profiles'].items():
 groups=collections.defaultdict(list)
 for e in d['edges']: groups[tuple(sorted((e['a'],e['b'])))].append(e)
 print(p,[(pair,len(es),round(max(e['max_gap'] for e in es),2)) for pair,es in groups.items()])
