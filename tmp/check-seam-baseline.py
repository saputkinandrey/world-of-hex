import sys,re,subprocess,io,json
from pathlib import Path
sys.path.insert(0,str(Path('godot/modules/character-animation-workbench/tools').resolve()))
from PIL import Image
from deformation_masks import ROOT,BONES,PARENTS,PALETTE,MANIFEST
from segmentation_atlas import source
report={}
for view,profile in [('south','south-body'),('north','north-0'),('south-west','south-west-0'),('north-west','north-west-0')]:
 path=(ROOT/'rigs/masked'/f'{profile}.tscn').relative_to(Path.cwd()).as_posix()
 text=subprocess.check_output(['git','show','HEAD:'+path]).decode()
 polyline=next(s for s in text.splitlines() if s.startswith('polygons = '))
 polygons=[list(map(int,re.findall(r'-?\d+',s))) for s in re.findall(r'PackedInt32Array\(([^)]*)\)',polyline)]
 line=next(s for s in text.splitlines() if s.startswith('metadata/cell_triangle_indices = '))
 cells=list(map(int,re.findall(r'-?\d+',line.split('(',1)[1])))
 maskpath=(ROOT/'masks'/f'{profile}-owners.png').relative_to(Path.cwd()).as_posix()
 owners=Image.open(io.BytesIO(subprocess.check_output(['git','show','HEAD:'+maskpath]))).convert('RGB')
 src=source(view);p={rgb:i for i,rgb in enumerate(PALETTE)};broken=0;joints=0
 for y in range(src.height):
  for x in range(src.width):
   if src.getpixel((x,y))[3]<128:continue
   for dx,dy in [(1,0),(0,1)]:
    nx,ny=x+dx,y+dy
    if nx>=src.width or ny>=src.height or src.getpixel((nx,ny))[3]<128:continue
    a,b=p[owners.getpixel((x,y))],p[owners.getpixel((nx,ny))]
    if a==b or not(PARENTS[a]==b or PARENTS[b]==a):continue
    f,s=[polygons[cells[(y*src.width+x)*2+i]] for i in range(2)]
    nf,ns=[polygons[cells[(ny*src.width+nx)*2+i]] for i in range(2)]
    edge=[f[1],f[2],nf[0],ns[2]] if dx else [s[2],f[2],nf[0],nf[1]]
    joints+=1;broken+=edge[0]!=edge[2] or edge[1]!=edge[3]
 report[view]={'HEAD_joint_edges':joints,'HEAD_disconnected_under_old_shared_vertex_assertion':broken}
print(json.dumps(report,indent=2))
Path('tmp/animation-workbench/segmentation/seam-baseline.json').write_text(json.dumps(report,indent=2)+'\n')
