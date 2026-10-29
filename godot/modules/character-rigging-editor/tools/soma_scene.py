"""Static inspectable SOMA editor controls; no runtime node construction."""
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
R='res://modules/character-rigging-editor/soma/'
text=f'''[gd_scene load_steps=4 format=3]
[ext_resource type="Script" path="{R}panel.gd" id="1"]
[ext_resource type="Script" path="{R}canvas.gd" id="2"]
[sub_resource type="StyleBoxFlat" id="Background"]
bg_color = Color(0.11,0.13,0.16,1)
[node name="Soma" type="Panel"]
anchor_right = 1.0
anchor_bottom = 1.0
offset_top = 48.0
script = ExtResource("1")
theme_override_styles/panel = SubResource("Background")
'''


def node(name,kind,x,y,w,h,props=''):
    global text
    text+=f'''[node name="{name}" type="{kind}" parent="."]
offset_left = {float(x)}
offset_top = {float(y)}
offset_right = {float(x+w)}
offset_bottom = {float(y+h)}
{props}
'''


node('Character','OptionButton',12,8,115,32)
node('Case','OptionButton',130,8,285,32)
node('Layer','OptionButton',425,8,240,32)
node('Save','Button',675,8,120,32,'text = "Save edits"')
node('Reload','Button',805,8,100,32,'text = "Reload"')
node('Refit','Button',915,8,140,32,'text = "Joint refit (CPU)"')
node('Accumulated','CheckBox',1070,8,350,32,'text = "Accumulated shared model"')
node('Previous','Button',12,49,80,30,'text = "< Step"')
node('Next','Button',100,49,80,30,'text = "Step >"')
node('Step','Label',190,49,550,30,'text = "Placement"')
node('ShoulderFocus','CheckBox',750,49,240,30,'text = "Shoulder chains"\nvisible = false')
node('FullSkeleton','CheckBox',1000,49,190,30,'text = "Full 77 joints"')
node('Evidence','CheckBox',1200,49,225,30,'text = "Masks / proposals"\nbutton_pressed = true')
node('Canvas','Control',12,90,915,700,'script = ExtResource("2")\nclip_contents = true\ntexture_filter = 1\nmouse_filter = 0')
node('Chunks','ItemList',945,90,475,195,'theme_override_font_sizes/font_size = 13')
node('MapLabel','Label',945,290,475,22,'text = "Selected chunk -> original SOMA names (comma separated)"\ntheme_override_font_sizes/font_size = 12')
node('Mapping','LineEdit',945,313,375,30)
node('ApplyMapping','Button',1325,313,95,30,'text = "Apply map"')
node('Exclude','CheckBox',945,348,475,30,'text = "Exclude this uncertain chunk from fitting"')
node('Joint','OptionButton',945,387,475,30)
node('PinLabel','Label',945,423,475,22,'text = "Manual native pixel pin X / Y (or drag joint in canvas)"\ntheme_override_font_sizes/font_size = 12')
node('PinX','SpinBox',945,448,120,30,'min_value = -500.0\nmax_value = 500.0\nstep = 0.25')
node('PinY','SpinBox',1075,448,120,30,'min_value = -500.0\nmax_value = 500.0\nstep = 0.25')
node('Pin','Button',1205,448,95,30,'text = "Set pin"')
node('Unpin','Button',1310,448,110,30,'text = "Clear pin"')
node('Semantics','CheckBox',945,489,475,30,'text = "I verified anatomical correspondence"')
node('Registration','CheckBox',945,521,475,30,'text = "I verified image / camera registration"')
node('Details','RichTextLabel',945,560,475,128,'bbcode_enabled = false\nscroll_active = true\ntheme_override_font_sizes/normal_font_size = 13')
node('ArtLabel','Label',945,693,475,22,'text = "Explicit art correction: selected bone multiplier + reason"\ntheme_override_font_sizes/font_size = 12')
node('ArtScale','SpinBox',945,719,120,30,'min_value = 0.25\nmax_value = 4.0\nstep = 0.01\nvalue = 1.0')
node('ArtReason','LineEdit',1075,719,345,30,'placeholder_text = "Required evidence / manual confirmation"')
node('ArtConfirm','Button',945,757,230,30,'text = "Confirm art correction"')
node('ArtClear','Button',1185,757,235,30,'text = "Remove art correction"')
node('Status','Label',12,800,1408,40,'autowrap_mode = 2\ntheme_override_font_sizes/font_size = 13')
node('Help','Label',12,840,1408,20,'text = "Wheel: zoom | middle drag: pan | left drag: manual joint pin | right: 3D prior (depth unobserved) | all scores: uncalibrated heuristics"\ntheme_override_font_sizes/font_size = 12')
(ROOT/'soma/panel.tscn').write_text(text,encoding='utf-8')
