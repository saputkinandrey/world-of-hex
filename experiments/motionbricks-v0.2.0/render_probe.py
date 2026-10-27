"""Render real official MotionBricks demo states through Newton's public GL capture API."""
import json
import sys
import numpy as np
from PIL import Image
import warp as wp

from paths import REPO, OUTPUT_ROOT
sys.path.insert(0,str(REPO))
import newton
import newton.viewer
from motionbricks.model.contract import ModelRig


def capture(viewer,folder,index):
    pixels=viewer.get_frame(render_ui=False).numpy()
    if pixels.shape!=(640,960,3): raise ValueError(f'Unexpected render size: {pixels.shape}')
    Image.fromarray(pixels).save(folder/f'frame-{index:05d}.png')


def inbetweener():
    from app.inbetweener_demo import InbetweenerDemo
    viewer=newton.viewer.ViewerGL(width=960,height=640,vsync=False)
    demo=None
    folder=OUTPUT_ROOT/'results/inbetweener'
    folder.mkdir(parents=True,exist_ok=True)
    try:
        demo=InbetweenerDemo(viewer,ModelRig.SOMA)
        demo.play()
        poses=[]
        for i in range(120):
            with wp.ScopedStream(demo.engine.stream):
                demo.step(1/30)
                demo.render()
                capture(viewer,folder,i)
                poses.append(demo.current_pose.numpy())
            if demo.error: raise RuntimeError(demo.error)
        arrays=np.stack(poses)
        if not np.isfinite(arrays).all() or demo.output.num_frames<=0: raise ValueError('No valid generated GUI animation')
        np.savez_compressed(folder/'poses.npz',poses=arrays)
        data=dict(generated_frames=demo.output.num_frames,root_travel_meters=float(np.linalg.norm(arrays[-1,0,:3]-arrays[0,0,:3])),frames=120,fps=30,seconds=4,renderer='official InbetweenerDemo + Newton ViewerGL.get_frame',error=demo.error)
        (folder/'validation.json').write_text(json.dumps(data,indent=2))
        print('INBETWEENER RENDER PASSED',json.dumps(data),flush=True)
    finally:
        if demo is not None: demo.engine.close()
        viewer.close()


def scene():
    from app.scene_preview import ScenePreview
    from app.runtime.common.motion import LocomotionCommand
    viewer=newton.viewer.ViewerGL(width=960,height=640,vsync=False)
    preview=None
    folder=OUTPUT_ROOT/'results/scene-preview'
    folder.mkdir(parents=True,exist_ok=True)
    try:
        preview=ScenePreview(viewer,REPO/'assets/scenes/soma_gym.scene.json')
        session=preview._scene_session
        character=session.character
        # Test input in world coordinates. Generation, overlap tests and the interaction
        # state machine remain the official application code, without replacing them.
        waypoints=[np.array([-6.,0.,0.]),np.array([8.,0.,0.])]
        index=0
        was_interacting=False
        events=[]
        logs=[]
        for i in range(420):
            with wp.ScopedStream(character.engine.stream):
                position=np.array(character.character_ground_position)
                if index<len(waypoints) and np.linalg.norm(waypoints[index][:2]-position[:2])<.45: index+=1
                movement=None
                direction=np.array([1.,0.,0.],np.float32)
                if index<len(waypoints):
                    direction=waypoints[index]-position
                    direction[2]=0
                    direction=(direction/max(np.linalg.norm(direction),1e-6)).astype(np.float32)
                    movement=direction
                preview._input.poll()
                character.step(1/30,LocomotionCommand(facing_direction=direction,movement=movement,use_max_speed=True))
                preview.time+=1/30
                preview._follow_character(1/30)
                preview._update_camera()
                preview._update_smart_primitive_interaction()
                preview._dispatch_interaction_input()
                interacting=bool(session.state_machine.is_interacting)
                if interacting!=was_interacting:
                    active=preview._active_interaction
                    event=dict(frame=i,time=i/30,interacting=interacting,object=active.definition.name if active is not None else None)
                    events.append(event)
                    print('INTERACTION',json.dumps(event),flush=True)
                was_interacting=interacting
                poses=character.current_pose.numpy()
                if not np.isfinite(poses).all(): raise ValueError('Scene NaN/Infinity')
                logs.append(dict(frame=i,root=poses[0,:3].tolist(),interacting=interacting))
                preview.render()
                capture(viewer,folder,i)
        if not any(e['interacting'] for e in events): raise ValueError('No official scene object interaction was triggered')
        if not any(not e['interacting'] for e in events): raise ValueError('Interaction did not finish')
        report=dict(frames=len(logs),fps=30,seconds=len(logs)/30,events=events,finite=True,root_max_height=max(f['root'][2] for f in logs),input='scripted LocomotionCommand, official automatic Smart Primitive overlap/dispatch/state machine',renderer='official ScenePreview + Newton ViewerGL.get_frame',log=logs)
        (folder/'validation.json').write_text(json.dumps(report,indent=2))
        print('SCENE INTERACTION RENDER PASSED',json.dumps({k:v for k,v in report.items() if k!='log'}),flush=True)
    finally:
        if preview is not None:
            s=preview._scene_session
            if s.state_machine.is_interacting:
                with wp.ScopedStream(s.character.engine.stream): s.state_machine.interaction_state.exit(s.character,s.state_machine)
            preview.close()
        viewer.close()


if __name__=='__main__':
    wp.init()
    wp.set_device('cuda:0')
    if sys.argv[1]=='visual-inbetweener': inbetweener()
    elif sys.argv[1]=='visual-scene': scene()
    else: raise ValueError('Unknown visual probe')

