from pathlib import Path
import json,math,sys
root=Path('godot/modules/character-animation-workbench');sys.path.insert(0,str(root/'tools'))
from calibrate_rig import number,vector
out=root/'animations/design';out.mkdir(exist_ok=True)
legacy=json.loads(Path('tmp/animation-workbench/expressive-reference/upper.json').read_text())
walk_foot=[(0,3,0,0),(.1,2,0,0),(.3,0,0,0),(.6,-3,0,0),(.7,-2.8,2.4,-.25),(.82,-.4,3.6,-.12),(.94,2.5,1.6,.10),(1,3,0,0)]
run_foot=[(0,5,0,0),(.08,5-10*.08/.38,0,0),(.24,5-10*.24/.38,0,0),(.38,-5,0,0),(.44,-5.8,2.8,-.28),(.58,-3.5,5.8,-.42),(.72,.2,6.5,-.18),(.88,4.5,4.2,.10),(1,5,0,0)]
walk_body=[(0,-.15),(.1,.5),(.25,.05),(.42,-.5),(.5,-.15)]
run_body=[(0,.05),(.08,.5),(.22,.1),(.35,-.25),(.44,-.5),(.5,.05)]
def interp(table,t):
 for a,b in zip(table,table[1:]):
  if a[0]<=t<=b[0]:
   u=(t-a[0])/(b[0]-a[0]);return [a[i]+(b[i]-a[i])*u for i in range(1,len(a))]
 raise ValueError(t)
def mix(a,b,w):
 if isinstance(a,list):return [mix(x,y,w) for x,y in zip(a,b)]
 return a+(b-a)*w
def loop(view,run,p):
 p%=1;key='run_loop' if run else 'walk_loop';samples=legacy[view][key];x=p*120;i=int(x);pose={k:mix(v,samples[min(i+1,120)][k],x-i) for k,v in samples[i].items()}
 pose['Pelvis:position'][1]=interp(run_body if run else walk_body,p%.5)[0]
 for side,offset in [('L',0),('R',.5)]:
  depth,lift,rotation=interp(run_foot if run else walk_foot,(p+offset)%1)
  pose['Foot'+side+':position']=[depth,-lift];pose['Foot'+side+':rotation']=rotation
 pose['Gait:position']=[float(run),1.]
 return pose
def sample(view,clip,t,d):
 u=t/d;w=u*u*(3-2*u)
 if clip=='walk_loop':return loop(view,False,t)
 if clip=='run_loop':return loop(view,True,t*1.5)
 if clip in ['walk_to_run','run_to_walk']:
  p=t+.25*t*t/d if clip=='walk_to_run' else 1.5*t-.25*t*t/d
  a,b=loop(view,False,p),loop(view,True,p)
  return {k:mix(a[k],b[k],w if clip=='walk_to_run' else 1-w) for k in a}
 running='run' in clip;entry=clip.startswith('idle_to');amp=w if entry else 1-w
 p=(-.375+1.5*t*t if entry else 1.5*t-1.5*t*t) if running else (t-.5 if entry else t)
 pose=loop(view,running,p)
 for k,v in pose.items():
  if k=='Gait:position':pose[k]=[float(running),amp]
  elif k=='Pelvis:position':pose[k]=[v[0]*amp,v[1]]
  else:pose[k]=mix([0.,0.] if isinstance(v,list) else 0.,v,amp)
 return pose
clips={'walk_loop':(1,1),'run_loop':(2/3,1),'idle_to_walk':(.5,0),'walk_to_idle':(.5,0),'walk_to_run':(.8,0),'run_to_walk':(.8,0),'idle_to_run':(.5,0),'run_to_idle':(.5,0)}
resources=[]
for view in legacy:
 (out/view).mkdir(exist_ok=True)
 for clip,(duration,looped) in clips.items():
  n=round(duration*120);samples=[sample(view,clip,duration*f/n,duration) for f in range(n+1)]
  s='[gd_resource type="Animation" format=3]\n\n[resource]\nresource_name = "'+clip+'"\nlength = '+number(duration)+'\nloop_mode = '+str(looped)+'\n'
  for i,key in enumerate(samples[0]):
   vals=[p[key] for p in samples];encoded=', '.join(vector(v) if isinstance(v,list) else number(v) for v in vals)
   s+=f'tracks/{i}/type = "value"\ntracks/{i}/path = NodePath("{key}")\ntracks/{i}/interp = 1\ntracks/{i}/enabled = true\ntracks/{i}/keys = {{"times": PackedFloat32Array('+', '.join(number(duration*f/n) for f in range(n+1))+'), "transitions": PackedFloat32Array('+', '.join('1' for _ in vals)+'), "update": 0, "values": ['+encoded+']}\n'
  s+=f'metadata/stance_fraction = {number(.38 if "run_loop"==clip else .6)}\nmetadata/stride = {number(5 if clip=="run_loop" else 3)}\nmetadata/reference_phase_offset = {number(.5 if view in ["north","north-west"] else 0)}\n'
  (out/view/f'{clip}.tres').write_text(s);resources.append((view,clip))
s='[gd_resource type="AnimationLibrary" format=3]\n'
for i,(view,clip) in enumerate(resources):s+=f'[ext_resource type="Animation" path="res://modules/character-animation-workbench/animations/design/{view}/{clip}.tres" id="{i+1}"]\n'
s+='\n[resource]\n_data = {'+', '.join('&"'+v+'/'+c+'": ExtResource("'+str(i+1)+'")' for i,(v,c) in enumerate(resources))+'}\n';(out/'poses.tres').write_text(s)
(out/'locomotion.tres').write_text('[gd_resource type="Resource" script_class="" format=3]\n[ext_resource type="Script" path="res://modules/character-animation-workbench/motion-design.gd" id="1"]\n[ext_resource type="AnimationLibrary" path="res://modules/character-animation-workbench/animations/design/poses.tres" id="2"]\n[resource]\nscript = ExtResource("1")\nposes = ExtResource("2")\nwalk_bounce = 1.5\nrun_bounce = 3.0\n')
# An ordinary AnimationPlayer scene opens the source tracks in Godot's timeline.
s='[gd_scene format=3]\n[ext_resource type="AnimationLibrary" path="res://modules/character-animation-workbench/animations/design/poses.tres" id="1"]\n[node name="MotionDesign" type="Node2D"]\n'
for name in ['Pelvis','Spine','Chest','Head','ArmL','ForearmL','ArmR','ForearmR','FootL','FootR','Gait']:s+=f'[node name="{name}" type="Node2D" parent="."]\n'
s+='[node name="AnimationPlayer" type="AnimationPlayer" parent="."]\nlibraries = {&"": ExtResource("1")}\n';(root/'motion-design.tscn').write_text(s)
print('Saved 32 editable source Animation resources with restored upper-body curves and explicit foot poses.')
