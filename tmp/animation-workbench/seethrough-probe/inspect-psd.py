import json
from pathlib import Path
from psd_tools import PSDImage
root=Path(__file__).resolve().parent
for mode in ["bicubic","nearest"]:
 path=root/"results"/mode/("south-west-"+mode+"-512.psd")
 if not path.exists():continue
 psd=PSDImage.open(path)
 result={"size":list(psd.size),"layers":[{"name":layer.name,"bbox":list(layer.bbox),"visible":layer.visible} for layer in psd.descendants()]}
 (root/(mode+"-psd-layers.json")).write_text(json.dumps(result,indent=2)+"\n")
 print(mode,result)
