from pathlib import Path
import numpy as np,json
from PIL import Image
root=Path('tmp/animation-workbench/comparison-ligaments/sequence')
results=[]
for path in sorted(root.glob('frame-*.png')):
 arr=np.array(Image.open(path).convert('RGB')).astype('int16')
 for side in range(4):
  crop=arr[120:438,side*512+110:side*512+400]
  bg=np.max(np.abs(crop-arr[0,0]),axis=2)<=2
  parents=[];runs=[];previous=[]
  def find(i):
   while parents[i]!=i:
    parents[i]=parents[parents[i]];i=parents[i]
   return i
  for y,row in enumerate(bg):
   transitions=np.diff(np.pad(row.astype('int8'),1))
   starts=np.flatnonzero(transitions==1); ends=np.flatnonzero(transitions==-1)
   current=[];j=0
   for left,right in zip(starts,ends):
    idx=len(parents);parents.append(idx);runs.append((int(left),int(right),y));current.append((left,right,idx))
    while j<len(previous) and previous[j][1]<=left:j+=1
    k=j
    while k<len(previous) and previous[k][0]<right:
     a,b=find(idx),find(previous[k][2]);parents[a]=b;k+=1
   previous=current
  groups={}
  for idx,(l,r,y) in enumerate(runs):
   key=find(idx)
   if key not in groups:groups[key]=[0,l,y,r,y+1,False]
   v=groups[key];v[0]+=r-l;v[1]=min(v[1],l);v[2]=min(v[2],y);v[3]=max(v[3],r);v[4]=max(v[4],y+1);v[5]|= l==0 or r==bg.shape[1] or y==0 or y==bg.shape[0]-1
  holes=[v[:5] for v in groups.values() if not v[5] and v[0]>=3]
  if holes:results.append({'frame':int(path.stem.split('-')[1]),'side':side,'holes':holes})
Path('tmp/animation-workbench/holes-before.json').write_text(json.dumps(results))
print('top enclosed holes:', sorted([(h[0],d['frame'],d['side'],h[1:]) for d in results for h in d['holes']],reverse=True)[:16])
