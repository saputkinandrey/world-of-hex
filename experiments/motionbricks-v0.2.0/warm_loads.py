import json
import sys
import time
from paths import REPO, OUTPUT_ROOT
sys.path.insert(0,str(REPO))
import warp as wp
from motionbricks.model.soma.engine import MotionBricksSOMAEngine
from motionbricks.model.soma.contract import SOMA_N1_FP32_ONNX_PATH,SOMA_N1_FP16_ONNX_PATH
from motionbricks.inference.builder import TensorRTBuildOptions
wp.init()
wp.set_device('cuda:0')
cache=REPO/'.trt-cache'
before={p.name:p.stat().st_mtime_ns for p in cache.glob('*.plan')}
rows=[]
for precision,path,half in [('fp32',SOMA_N1_FP32_ONNX_PATH,False),('fp16',SOMA_N1_FP16_ONNX_PATH,True)]:
    start=time.perf_counter()
    engine=MotionBricksSOMAEngine(path,build_options=TensorRTBuildOptions(enable_fp16=half))
    seconds=time.perf_counter()-start
    engine.close()
    rows.append(dict(precision=precision,cached_constructor_seconds=seconds))
after={p.name:p.stat().st_mtime_ns for p in cache.glob('*.plan')}
if before!=after: raise ValueError('Expected cached plans, but cache files changed')
report=dict(cache_files_unchanged=True,rows=rows)
(OUTPUT_ROOT/'results/warm-loads.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report))
