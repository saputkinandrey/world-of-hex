"""Write inspectable static scene nodes; no runtime node factories."""
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
R = 'res://modules/character-rigging-editor/'
text = f'''[gd_scene load_steps=7 format=3]
[ext_resource type="Script" path="{R}editor.gd" id="1"]
[ext_resource type="Script" path="{R}canvas.gd" id="2"]
[ext_resource type="PackedScene" path="{R}rig.tscn" id="3"]
[ext_resource type="Script" path="{R}timeline.gd" id="4"]
[ext_resource type="Script" path="{R}sequence.gd" id="5"]
[ext_resource type="PackedScene" path="{R}soma/panel.tscn" id="6"]
[node name="RiggingEditor" type="Control"]
layout_mode = 3
anchors_preset = 15
anchor_right = 1.0
anchor_bottom = 1.0
grow_horizontal = 2
grow_vertical = 2
script = ExtResource("1")
[node name="Viewport" type="SubViewport" parent="."]
size = Vector2i(150,150)
transparent_bg = true
render_target_update_mode = 4
canvas_item_default_texture_filter = 0
[node name="Source" parent="Viewport" instance=ExtResource("3")]
[node name="Target" parent="Viewport" instance=ExtResource("3")]
visible = false
[node name="Reference" type="Sprite2D" parent="Viewport"]
visible = false
centered = false
[node name="Comparison" type="SubViewport" parent="."]
size = Vector2i(300,150)
transparent_bg = true
render_target_update_mode = 4
[node name="SWSource" parent="Comparison" instance=ExtResource("3")]
[node name="SWTarget" parent="Comparison" instance=ExtResource("3")]
[node name="NWSource" parent="Comparison" instance=ExtResource("3")]
[node name="NWTarget" parent="Comparison" instance=ExtResource("3")]
[node name="Sequence" type="Node" parent="."]
script = ExtResource("5")
[node name="AnimationPlayer" type="AnimationPlayer" parent="."]
[node name="Canvas" type="Control" parent="."]
offset_left = 214.0
offset_top = 50.0
anchor_right = 1.0
anchor_bottom = 1.0
offset_right = -330.0
offset_bottom = -130.0
clip_contents = true
mouse_filter = 0
script = ExtResource("2")
texture_filter = 1
'''

def node(name, kind, x, y, w, h, props=''):
    global text
    text += f'\n[node name="{name}" type="{kind}" parent="."]\noffset_left = {x}.0\noffset_top = {y}.0\noffset_right = {x+w}.0\noffset_bottom = {y+h}.0\n{props}\n'

node('Title','Label',12,7,194,30,'text = "Character1 / v1.0.0"')
node('Catalog','Tree',10,50,194,400,'hide_root = false')
node('Save','Button',10,460,194,34,'text = "Save all changes"')
node('Mode','OptionButton',220,8,205,32)
node('SourceLabel','Label',440,8,570,32,'text = "Loading anatomy..."')
node('SingleView','OptionButton',890,8,205,32)
node('Bone','OptionButton',1120,50,300,30)
node('Properties','Label',1120,88,300,140,'theme_override_font_sizes/font_size = 13')
for name,y,label in [('X',235,'Joint X'),('Y',265,'Joint Y'),('Angle',295,'Rotation degrees'),('Length',325,'Bone length'),('RootX',355,'Registration X'),('RootY',385,'Registration Y'),('Z',415,'Chunk z order'),('Deformation',445,'Soft band (0..1)')]:
    node(name+'Label','Label',1120,y,140,28,f'text = "{label}"')
    node(name,'SpinBox',1270,y,150,28,'min_value = -720.0\nmax_value = 720.0\nstep = 0.1')
node('Reset','Button',1120,473,300,30,'text = "Reset selected bone"')
for i,(name,label) in enumerate([('Skeleton','Skeleton / joints'),('Anatomy','Anatomical masks'),('Grid','Pixel grid'),('Mesh','Deformed geometry'),('Chunks','Chunk boundaries'),('Background','Light background'),('Texture','Source texture'),('Sources','Show Texture Sources'),('Seams','Seam visualization'),('OriginalOverlay','Original texture overlay')]):
    node(name,'CheckButton',1120,511+i*29,300,28,f'text = "{label}"\nbutton_pressed = '+('true' if name in ['Skeleton','Texture'] else 'false'))
node('SwitchMode','OptionButton',10,510,194,30)
node('SwitchTimeLabel','Label',10,545,194,26,'text = "Texture switch (0..1)"')
node('SwitchTime','SpinBox',10,573,194,30,'max_value = 1.0\nstep = 0.01\nvalue = 0.5')
node('Blend','CheckButton',10,609,194,30,'text = "Enable chunk blend"')
node('BlendDuration','SpinBox',10,643,194,30,'max_value = 1.0\nstep = 0.01')
node('Interpolation','OptionButton',10,680,194,30)
node('Skin','OptionButton',10,716,194,30)
node('Help','Label',10,752,194,130,'text = "Wheel: 2x..32x\nMiddle drag: pan\nLeft drag: move joint\nGold: bone keys\nPurple: texture switch"')
node('Timeline','HSlider',220,790,870,28,'max_value = 1.0\nstep = 0.0001\nscript = ExtResource("4")')
for i,(name,label) in enumerate([('Start','|<'),('Previous','< frame'),('Play','Play / Pause'),('Stop','Stop'),('Next','frame >'),('End','>|'),('AddKey','Add key'),('DeleteKey','Delete key')]):
    node(name,'Button',220+i*108,828,104,30,f'text = "{label}"')
node('Loop','CheckButton',220,860,100,30,'text = "Loop"')
node('Speed','SpinBox',320,860,105,30,'min_value = 0.1\nmax_value = 4.0\nstep = 0.1\nvalue = 1.0')
node('FPS','OptionButton',435,860,100,30)
node('Duration','SpinBox',545,860,100,30,'min_value = 0.1\nmax_value = 20.0\nstep = 0.1\nvalue = 1.0')
node('Keys','OptionButton',655,860,210,30)
node('MoveKey','Button',875,860,210,30,'text = "Move selected key here"')
node('Status','Label',220,754,870,28,'text = "Stage A"\ntheme_override_font_sizes/font_size = 13')
node('Unsaved','ConfirmationDialog',350,250,500,160,'title = "Unsaved changes"\ndialog_text = "Save changes before switching resources?"\nok_button_text = "Save and continue"')
text+='[node name="Soma" parent="." instance=ExtResource("6")]\nvisible = false\n'
(ROOT/'editor.tscn').write_text(text, encoding='utf-8')
