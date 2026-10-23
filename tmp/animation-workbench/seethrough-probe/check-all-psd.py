from pathlib import Path
from psd_tools import PSDImage
for p in Path(__file__).resolve().parent.glob("results/*/*.psd"):
 doc=PSDImage.open(p)
 assert doc.size==(512,512),p
 print(p.name,doc.size,len(list(doc.descendants())),"layers")
