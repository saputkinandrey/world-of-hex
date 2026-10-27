"""Read-only probes around official SOMA APIs; outputs stay in this experiment."""
import importlib.metadata as metadata
import json
import platform
import subprocess
import sys
import time
import numpy as np

from paths import REPO, OUTPUT_ROOT
sys.path[:0]=[str(REPO),str(REPO/'docs/examples')]
OUT=OUTPUT_ROOT/'results'
OUT.mkdir(parents=True,exist_ok=True)


def write(name,data):
    (OUT/name).write_text(json.dumps(data,indent=2)+'\n',encoding='utf-8')


def gpu():
    result=subprocess.run(['nvidia-smi','--query-gpu=name,memory.used,memory.total,driver_version,compute_cap','--format=csv,noheader'],capture_output=True,text=True,check=True)
    return result.stdout.strip()


def environment():
    import warp as wp
    import tensorrt as trt
    wp.init()
    wp.set_device('cuda:0')
    versions={name:metadata.version(name) for name in ['motionbricks','tensorrt-cu12','tensorrt-cu12-bindings','tensorrt-cu12-libs','warp-lang','newton','numpy','usd-core']}
    data=dict(os=platform.platform(),python=sys.version,versions=versions,gpu=gpu(),warp_device=str(wp.get_device()),warp_arch=wp.get_device().arch,commit=subprocess.check_output(['git','rev-parse','HEAD'],cwd=REPO,text=True).strip())
    models=[]
    for path in sorted((REPO/'motionbricks/assets/onnx/soma').iterdir()):
        if path.suffix not in ['.onnx','.json']: continue
        with path.open('rb') as stream: header=stream.read(128)
        if header.startswith(b'version https://git-lfs.github.com/spec/v1'): raise ValueError(f'LFS pointer: {path}')
        models.append(dict(file=path.name,bytes=path.stat().st_size))
    data['soma_models']=models
    write('environment.json',data)
    print(json.dumps(data,indent=2))


def validate_motion(name,poses,rate):
    array=np.asarray(poses)
    if array.ndim!=3 or array.shape[2]!=7 or len(array)<4: raise ValueError(f'{name}: invalid SOMA transform array {array.shape}')
    if not np.isfinite(array).all(): raise ValueError(f'{name}: NaN/Infinity')
    norms=np.linalg.norm(array[:,:,3:7],axis=2)
    if np.max(np.abs(norms-1))>.01: raise ValueError(f'{name}: invalid quaternion norms')
    roots=array[:,0,:3]
    return dict(shape=list(array.shape),finite=True,sample_rate=rate,duration_seconds=len(array)/rate,root_start=roots[0].tolist(),root_end=roots[-1].tolist(),max_root_step_meters=float(np.linalg.norm(np.diff(roots,axis=0),axis=1).max()),max_quaternion_norm_error=float(np.max(np.abs(norms-1))))


def verify():
    import generate_once
    import locomotion_loop
    started=time.perf_counter()
    segments=generate_once.generate('soma')
    records=[validate_motion(f'generation-{i}',a,30) for i,a in enumerate(segments)]
    seam=float(np.max(np.abs(segments[0][-1]-segments[1][0])))
    translation_seam=float(np.max(np.abs(segments[0][-1,:,:3]-segments[1][0,:,:3])))
    qa,qb=segments[0][-1,:,3:],segments[1][0,:,3:]
    dots=np.abs(np.sum(qa*qb,axis=1)/(np.linalg.norm(qa,axis=1)*np.linalg.norm(qb,axis=1)))
    rotation_seam=float(np.max(2*np.arccos(np.clip(dots,0,1))))
    if translation_seam>.001 or rotation_seam>.005: raise ValueError(f'Chained geometric discontinuity: translation={translation_seam}, radians={rotation_seam}')
    shown=np.stack(locomotion_loop.run('soma'))
    loop=validate_motion('locomotion',shown,60)
    np.savez_compressed(OUT/'soma-generations.npz',first=segments[0],second=segments[1],locomotion=shown)
    data=dict(generations=records,chained_endpoint_max_abs_difference=seam,chained_translation_max_meters=translation_seam,chained_rotation_max_radians=rotation_seam,locomotion=loop,wall_seconds=time.perf_counter()-started)
    write('animation-validation.json',data)
    print('ANIMATION VALIDATION PASSED',json.dumps(data))


def benchmark(fp16=False):
    import warp as wp
    import tensorrt as trt
    from types import SimpleNamespace
    class BuildProgress(trt.IProgressMonitor):
        def __init__(self):
            trt.IProgressMonitor.__init__(self)
            self.started={}
            self.phases=[]
        def phase_start(self,name,parent,steps):
            if not parent:
                self.started[name]=time.perf_counter()
                print('BUILD_PHASE_BEGIN',name,flush=True)
        def step_complete(self,name,step):
            return True
        def phase_finish(self,name):
            if name in self.started:
                seconds=time.perf_counter()-self.started.pop(name)
                self.phases.append(dict(name=name,seconds=seconds))
                print('BUILD_PHASE_END',name,seconds,flush=True)
    progress=BuildProgress()
    from motionbricks.io.bvh import load_bvh
    from motionbricks.io.usd import load_skeleton_from_usd
    from motionbricks.io.utils import SOMA_SKELETON_PRIM_PATH,get_asset_file
    from motionbricks.model.soma.contract import SOMA_N1_FP32_ONNX_PATH,SOMA_N1_FP16_ONNX_PATH
    from motionbricks.model.soma.engine import MotionBricksSOMAEngine
    from motionbricks.inference.builder import TensorRTBuildOptions
    from motionbricks.utils.space_conversion_utils import FacingDirectionType,SpaceConverter
    from _rig import sample_window,WALK
    wp.init()
    wp.set_device('cuda:0')
    skeleton=load_skeleton_from_usd(get_asset_file('human','soma_base_skel_minimal_no_root.usd'),SOMA_SKELETON_PRIM_PATH)
    clip=load_bvh(str(REPO/'assets/motions/soma'/f'{WALK}.bvh'),skeleton)
    placement=SpaceConverter(FacingDirectionType.MUJOCO).convert_transform(wp.transform_identity())
    model=SOMA_N1_FP16_ONNX_PATH if fp16 else SOMA_N1_FP32_ONNX_PATH
    before=gpu()
    started=time.perf_counter()
    engine=MotionBricksSOMAEngine(model,model_to_runtime=placement,build_options=TensorRTBuildOptions(enable_fp16=fp16),build_progress_monitor=progress)
    load_seconds=time.perf_counter()-started
    loaded_gpu=gpu()
    rows=[]
    with engine,wp.ScopedStream(engine.stream):
        rig=SimpleNamespace(engine=engine,skeleton=skeleton,clip=clip,model_to_runtime=placement)
        context,target=engine.create_input(skeleton),engine.create_input(skeleton)
        output=engine.create_output(skeleton)
        context_poses,target_poses=wp.empty_like(context.poses),wp.empty_like(target.poses)
        sample_window(rig,.9,context_poses)
        sample_window(rig,1.8,target_poses)
        for i in range(13):
            context.update_from_poses(context_poses,stream=engine.stream)
            target.update_from_poses(target_poses,stream=engine.stream)
            engine.synchronize()
            start=time.perf_counter()
            engine.generate_animation(context,target,output)
            engine.synchronize()
            wall_ms=(time.perf_counter()-start)*1000
            arrays=output.poses[:output.num_frames].numpy()
            validation=validate_motion('benchmark',arrays,30)
            row=dict(index=i,warmup=i<3,wall_ms=wall_ms,stage_gpu_ms=dict(engine.timer.milliseconds),frames=output.num_frames,animation_seconds=output.num_frames/30)
            rows.append(row)
            print(json.dumps(row),flush=True)
        np.savez_compressed(OUT/('fp16-sample.npz' if fp16 else 'fp32-sample.npz'),poses=arrays)
        active_gpu=gpu()
    measured=rows[3:]
    report=dict(precision='mixed-fp16' if fp16 else 'fp32',initialization_seconds=load_seconds,build_phases_seconds=progress.phases,gpu_before=before,gpu_loaded=loaded_gpu,gpu_active=active_gpu,rows=rows,median_wall_ms=float(np.median([r['wall_ms'] for r in measured])),median_inference_gpu_ms=float(np.median([r['stage_gpu_ms']['inference'] for r in measured])),median_generated_frames=float(np.median([r['frames'] for r in measured])),last_output=validation)
    write('benchmark-fp16.json' if fp16 else 'benchmark-fp32.json',report)
    print('BENCHMARK PASSED',json.dumps(report))


if __name__=='__main__':
    action=sys.argv[1]
    if action=='verify':
        environment()
        verify()
    elif action=='benchmark': benchmark()
    elif action=='fp16': benchmark(True)
    else: raise ValueError(f'Unknown action: {action}')


