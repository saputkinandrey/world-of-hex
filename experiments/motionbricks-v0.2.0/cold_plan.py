import json
import sys
import time
from paths import REPO, OUTPUT_ROOT, MODEL_ROOT
sys.path.insert(0,str(REPO))
import warp as wp
import tensorrt as trt
from motionbricks.model.soma.engine import MotionBricksSOMAEngine
from motionbricks.model.soma.contract import SOMA_N1_FP32_ONNX_PATH

class Monitor(trt.IProgressMonitor):
    def __init__(self):
        trt.IProgressMonitor.__init__(self)
        self.starts={}
        self.phases=[]
    def phase_start(self,name,parent,steps):
        if not parent:
            self.starts[name]=time.perf_counter()
            print('BUILD_PHASE_BEGIN',name,flush=True)
    def step_complete(self,name,step): return True
    def phase_finish(self,name):
        if name in self.starts:
            seconds=time.perf_counter()-self.starts.pop(name)
            self.phases.append(dict(name=name,seconds=seconds))
            print('BUILD_PHASE_END',name,seconds,flush=True)

wp.init()
wp.set_device('cuda:0')
cache=MODEL_ROOT/'cold'/OUTPUT_ROOT.name
if list(cache.glob('*.plan')): raise ValueError('Cold measurement requires an empty dedicated cache; existing files preserved')
monitor=Monitor()
start=time.perf_counter()
engine=MotionBricksSOMAEngine(SOMA_N1_FP32_ONNX_PATH,cache_dir=cache,build_progress_monitor=monitor)
elapsed=time.perf_counter()-start
engine.close()
if not monitor.phases: raise ValueError('No build phase measured')
data=dict(precision='fp32',constructor_seconds=elapsed,build_phases_seconds=monitor.phases,cache=str(cache),note='Separate cache; canonical plan and benchmark left unchanged')
(OUTPUT_ROOT/'results/fp32-cold-build.json').write_text(json.dumps(data,indent=2)+'\n')
print(json.dumps(data),flush=True)
