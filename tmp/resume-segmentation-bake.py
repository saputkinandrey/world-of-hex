import sys,io
from pathlib import Path
sys.path.insert(0,str(Path('godot/modules/character-animation-workbench/tools').resolve()))
from PIL import Image
import deformation_masks as m
save=Image.Image.save
def save_buffer(image,fp,format=None,**params):
 if isinstance(fp,(str,Path)) and str(fp).endswith('.png'):
  buffer=io.BytesIO();save(image,buffer,format='PNG',**params);Path(fp).write_bytes(buffer.getvalue())
 else: save(image,fp,format=format,**params)
Image.Image.save=save_buffer
manifest=m.json.loads(m.MANIFEST.read_text())
for name,profile in manifest['profiles'].items():
 if name in ['south-0','south-1']:continue
 m.compile_profile(name,profile,name==manifest['bindings'][profile['view']]['Layers/BodyBase'])
m.bind_rigs(manifest)
