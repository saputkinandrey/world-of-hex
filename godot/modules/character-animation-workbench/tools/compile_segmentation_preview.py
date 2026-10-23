"""Compile diagnostic rigid chunks; production skinning algorithms stay separate."""
import json
from PIL import Image
from deformation_masks import ROOT, MASKS, MANIFEST, ASSETS, BONES, PALETTE, PATHS, RES
from segmentation_atlas import source


def compile_view(view, name, order):
    image = source(view)
    owners = Image.open(MASKS/(name+'-owners.png')).convert('RGB')
    palette = {color:index for index,color in enumerate(PALETTE)}
    vertices,uv,colors,weights,polygons = [],[],[],[],[]
    lookup = {}
    cells = [(palette[owners.getpixel((x,y))],x,y) for y in range(image.height) for x in range(image.width) if image.getpixel((x,y))[3]]
    for owner,x,y in sorted(cells,key=lambda cell:order.index(BONES[cell[0]])):
        ids = []
        for px,py in [(x,y),(x+1,y),(x+1,y+1),(x,y+1)]:
            key = owner,px,py
            if key not in lookup:
                lookup[key] = len(vertices)
                vertices.append((px-image.width/2,py-image.height/2))
                uv.append((px,py))
                colors.append(PALETTE[owner])
                weights.append(owner)
            ids.append(lookup[key])
        polygons.extend([(ids[0],ids[1],ids[2]),(ids[0],ids[2],ids[3])])
    asset = ROOT.parents[1]/'assets/Character/Character1/idle'/ASSETS[view][0]/ASSETS[view][1]
    text = '[gd_scene format=3]\n'
    text += '[ext_resource type="Texture2D" path="res://'+asset.relative_to(ROOT.parents[1]).as_posix()+'" id="1"]\n'
    text += '[ext_resource type="Shader" path="'+RES+'tests/segmentation-debug.gdshader" id="2"]\n'
    text += '[sub_resource type="ShaderMaterial" id="Material"]\nresource_local_to_scene = true\nshader = ExtResource("2")\n'
    text += '[node name="SegmentationSurface" type="Polygon2D"]\nmaterial = SubResource("Material")\ntexture = ExtResource("1")\ntexture_filter = 1\nskeleton = NodePath("../Skeleton2D")\n'
    text += 'polygon = PackedVector2Array('+','.join(str(value) for point in vertices for value in point)+')\n'
    text += 'uv = PackedVector2Array('+','.join(str(value) for point in uv for value in point)+')\n'
    text += 'vertex_colors = PackedColorArray('+','.join(str(channel/255) for color in colors for channel in (*color,255))+')\n'
    text += 'polygons = ['+','.join('PackedInt32Array('+','.join(map(str,triangle))+')' for triangle in polygons)+']\n'
    bindings = []
    for index,path in enumerate(PATHS):
        bindings.extend(['"'+path+'"','PackedFloat32Array('+','.join('1' if owner == index else '0' for owner in weights)+')'])
    text += 'bones = ['+','.join(bindings)+']\n'
    text += 'metadata/source_pixels = '+str(len(cells))+'\nmetadata/chunk_owners = PackedByteArray('+','.join(map(str,weights))+')\n'
    (ROOT/'tests'/('segmentation-'+view+'.tscn')).write_text(text)


def build():
    manifest = json.loads(MANIFEST.read_text())
    order = json.loads((ROOT/'directional-depth.json').read_text())['directions']
    views = [('south','South','SOUTH'),('north','North','NORTH'),('south-west','SouthWest','SOUTH_WEST'),('north-west','NorthWest','NORTH_WEST')]
    scene = '[gd_scene format=3]\n[ext_resource type="PackedScene" path="'+RES+'tests/comparison-preview.tscn" id="1"]\n'
    for index,(view,name,direction) in enumerate(views):
        compile_view(view,manifest['bindings'][view]['Layers/BodyBase'],order[direction])
        scene += '[ext_resource type="PackedScene" path="'+RES+'tests/segmentation-'+view+'.tscn" id="'+str(index+2)+'"]\n'
    scene += '[node name="SegmentationPreview" instance=ExtResource("1")]\nautoplay = false\n'
    for index,(view,name,direction) in enumerate(views):
        scene += '[node name="SegmentationSurface" parent="Viewport/'+name+'/Preview/Mirror/'+name+'" instance=ExtResource("'+str(index+2)+'")]\n'
    (ROOT/'tests/segmentation-preview.tscn').write_text(scene)
    print('Four diagnostic chunk meshes compiled from reviewed ownership masks.')


if __name__ == '__main__':
    build()
