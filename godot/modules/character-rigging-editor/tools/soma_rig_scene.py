"""Author the static controls used inside the existing SOMA editor."""
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
R='res://modules/character-rigging-editor/soma/'
text=f'''[gd_scene load_steps=4 format=3]
[ext_resource type="Script" path="{R}rig_panel.gd" id="1"]
[ext_resource type="Script" path="{R}rig_canvas.gd" id="2"]
[sub_resource type="StyleBoxFlat" id="Background"]
bg_color = Color(0.075,0.095,0.13,1)
[node name="RigEditor" type="Panel"]
anchor_right = 1.0
anchor_bottom = 1.0
script = ExtResource("1")
theme_override_styles/panel = SubResource("Background")
'''


def node(name, kind, x, y, w, h, props=''):
    global text
    text+=f'''[node name="{name}" type="{kind}" parent="."]
offset_left = {float(x)}
offset_top = {float(y)}
offset_right = {float(x+w)}
offset_bottom = {float(y+h)}
{props}
'''


def button(name, label, x,y,w):node(name,'Button',x,y,w,30,f'text = "{label}"')
def label(name,label,x,y,w=380,h=24):node(name,'Label',x,y,w,h,f'text = "{label}"\ntheme_override_font_sizes/font_size = 13')
def spin(name,x,y,w=112,minimum=-10000,maximum=10000,step=.001):node(name,'SpinBox',x,y,w,32,f'min_value = {float(minimum)}\nmax_value = {float(maximum)}\nstep = {float(step)}')

button('Back','Calibration',12,8,110)
label('Title','SOMA Multi-View Rig Editor | Character1 / Idle',135,10,520)
button('Undo','Undo',670,8,75);button('Redo','Redo',750,8,75)
button('Save','Save all',835,8,100);button('Reload','Reload',945,8,85)
node('NorthProfile','OptionButton',1040,8,245,30,'tooltip_text = "Load preserved North-pair comparison profile (undoable)"')
button('DetachNorth','Detach NE',1290,8,130)
for name,label_text,x in [('Full','Full 77',12),('Masks','Masks',120),('Skeleton','Skeleton',220),('AnchorTool','Anchor tool',340)]:
    node(name,'CheckBox',x,44,120,30,f'text = "{label_text}"'+('\nbutton_pressed = true' if name=='Skeleton' else ''))
button('All','All six',490,44,90);button('Focus','Focus view',590,44,110);button('Center','Center',710,44,90)
node('Canvas','Control',8,82,1012,710,'script = ExtResource("2")\nclip_contents = true\nmouse_filter = 0')
node('View','OptionButton',1040,44,380,32)
node('Joint','OptionButton',1040,85,380,32)
node('Scope','OptionButton',1040,126,380,32)
node('Parameter','OptionButton',1040,168,380,32)
label('XYZ','X / length                      Y                            Z',1040,203)
for i,name in enumerate(['X','Y','Z']):spin(name,1040+i*126,228)
button('Apply','Apply joint parameter',1040,269,380)
node('Enabled','CheckBox',1040,308,380,28,'text = "Enable View Overrides"')
button('ResetJoint','Reset joint lens',1040,342,182);button('ResetView','Clear view lenses',1230,342,190)
label('CameraLabel','Camera: yaw / pitch (degrees) / scale (px/m)',1040,383)
spin('Yaw',1040,410,112,minimum=-360,maximum=360,step=.1)
spin('Pitch',1166,410,112,minimum=-89,maximum=89,step=.1)
spin('Scale',1292,410,112,minimum=.1,maximum=1000,step=.01)
button('ApplyCamera','Apply camera',1040,449,380)
node('CameraStatus','Label',1040,485,380,52,'autowrap_mode = 2\ntheme_override_font_sizes/font_size = 12')
label('AnchorLabel','Sprite Anchor: joint / target pixels',1040,541)
node('AnchorJoint','OptionButton',1040,568,380,30)
spin('AnchorX',1040,606,174,step=.1);spin('AnchorY',1230,606,174,step=.1)
button('ApplyAnchor','Apply anchor X/Y',1040,646,182);button('ResetAnchor','Reset anchor',1230,646,190)
node('Details','Label',1040,689,380,145,'theme_override_font_sizes/font_size = 11\nautowrap_mode = 2')
label('Status','',12,806,1010,28)
(ROOT/'soma/rig_panel.tscn').write_text(text,encoding='utf-8')
