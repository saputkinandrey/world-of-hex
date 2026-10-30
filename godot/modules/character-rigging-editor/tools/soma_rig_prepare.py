"""Six camera hypotheses and editable seed, preserving the original South pair."""
import copy
import numpy as np
from scipy.optimize import least_squares
from soma_common import ROOT, REPO, read, write, project
from soma_multiview_model import snapshot, fingerprint, assert_unchanged
from soma_multiview_observations import load_observations, residual, metrics

OUT = ROOT / 'rig-editor'
ORDER = ['south-west', 'south', 'south-east', 'north-west', 'north', 'north-east']


def prepare():
    base = snapshot()
    model = base['canonical']
    positions = np.array(base['positions_m'])
    entries = {a['direction']: a for a in read(REPO / 'experiments/densepose-full-character-v1.0.0/source-inventory.json')['atlases'] if a['pose'] == 'idle'}
    assert set(entries) == set(ORDER)
    cameras = {'south': copy.deepcopy(base['camera_south']),
               'south-west': read(ROOT / 'multiview/camera-south-west.json')['after']}
    diagnostics = {}
    for view, yaw in [('north', -np.pi), ('north-west', -3*np.pi/4)]:
        obs = load_observations(base, 'idle/'+view)
        h, w = obs['alpha'].shape
        seed = cameras['south']
        x0 = [yaw, seed['pitch'], np.log(seed['pixels_per_metre']), w/2, h*.85]
        def unpack(x):
            return dict(yaw=float(x[0]), pitch=float(x[1]), pixels_per_metre=float(np.exp(x[2])), tx=float(x[3]), ty=float(x[4]))
        fit = least_squares(lambda x: residual(project(positions, unpack(x)), obs, model['joint_names']), x0,
                            bounds=([yaw-.65, -.7, np.log(20), -200, -200], [yaw+.65, .7, np.log(100), 400, 400]),
                            loss='soft_l1', max_nfev=160)
        cameras[view] = unpack(fit.x)
        diagnostics[view] = dict(success=bool(fit.success), evaluations=fit.nfev,
                                 initial=unpack(x0), metrics=metrics(project(positions, cameras[view]), obs, model['joint_names']),
                                 status='provisional: source masks need review; frozen South pose may differ artistically')
    source_cameras = copy.deepcopy(cameras)
    images = {}
    anchors = {}
    hips = model['joint_names'].index('Hips')
    for view in ORDER:
        entry = entries[view]
        source = entry['source_direction']
        mirror = entry['mirrored']
        cam = copy.deepcopy(source_cameras[source])
        w, h = entry['frame_size']
        translation = [w-cam['tx'] if mirror else cam['tx'], cam['ty']]
        cam.pop('tx'); cam.pop('ty')
        cam.update(mirror_x=mirror, source_view=source,
                   status='derived reflection: not independent evidence' if mirror else diagnostics.get(view, {}).get('status', 'preserved existing calibration'))
        cameras[view] = cam
        image_id = 'idle/'+view
        unshifted = project(positions, dict(cam, tx=0, ty=0))
        if mirror: unshifted[:, 0] *= -1
        anchors[image_id] = dict(joint='Hips', offset_px=translation,
                                target_px=(unshifted[hips]+translation).tolist())
        images[view] = dict(id=image_id, source='res://modules/character-rigging-editor/soma/assets/idle/'+source+'/source.png',
                            chunks='res://modules/character-rigging-editor/soma/assets/idle/'+source+'/chunks.png',
                            native_size=[w, h], mirror_x=mirror, anatomical_correspondence='same joint names; reflected raster basis, no anatomical swap',
                            independent=not mirror)
    seed = dict(schema='soma-multiview-rig/1', character='Character1', pose='idle', model_id=base['model_id'],
                baseline_fingerprint=fingerprint(base), canonical=model, images=images,
                geometry={'local_offsets_m':base['geometry']['local_offsets_m']},
                base_pose={'local_rotation_vectors':base['pose']['local_rotation_vectors'], 'root_translation_m':[0.,0.,0.]},
                cameras=cameras, anchors=anchors,
                overrides={'idle/'+v:dict(enabled=True, joints={}) for v in ORDER})
    write(OUT/'seed.json', seed)
    write(OUT/'camera-validation.json', dict(frozen_geometry=True, frozen_local_rotations=True,
          frozen_positions_sha256=fingerprint(positions.tolist()), independent_views=4, derived_views=2,
          diagnostics=diagnostics, original_south_west_preserved=True))
    assert_unchanged(base)
    print({v: {k: c[k] for k in ['yaw','pitch','pixels_per_metre','mirror_x','status']} for v,c in cameras.items()})


if __name__ == '__main__': prepare()
