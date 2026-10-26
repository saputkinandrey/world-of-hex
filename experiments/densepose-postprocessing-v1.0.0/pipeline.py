"""Saved compact maps -> shared owners -> bounded fill -> conservative transfer."""
import subprocess
from pathlib import Path

import numpy as np
from PIL import Image

from core import (ROOT, REPO, read, write, sha, flood, transfer, transform, provenance,
                  invariants, components, CROSS)


def baseline_for(atlas, config):
    key = f'{atlas["pose"]}/{atlas["direction"]}'
    source_key = f'{atlas["pose"]}/{atlas["source_direction"]}'
    inherited = config['atlas_overrides'].get(source_key,config['baseline_frame'])
    selected = config['atlas_overrides'].get(key,inherited)
    if type(selected) is not int or not 0 <= selected < 5:
        raise ValueError(f'Invalid baseline index: {key}')
    if atlas['mirrored'] and selected != inherited:
        raise ValueError(f'Mirror baseline must match source {source_key}: {key}')
    return selected


def load_inputs():
    config = read(ROOT/'config.json')
    source = (ROOT/config['source']).resolve()
    inventory, labels = read(source/'source-inventory.json'), read(source/'labels.json')
    groups = list(labels['groups'])
    lookup = np.zeros(25,dtype=np.uint8)
    for i,name in enumerate(groups,1):
        lookup[labels['groups'][name]] = i
    data = {}
    for atlas in inventory['atlases']:
        key = f'{atlas["pose"]}/{atlas["direction"]}'
        if atlas['hframes']*atlas['vframes'] != 5:
            raise ValueError(f'Expected five explicit skin frames: {key}')
        if sha(REPO/atlas['source_file']) != atlas['source_sha256']:
            raise ValueError(f'Authored atlas changed since inventory: {key}')
        frames = []
        for skin in range(5):
            folder = source/'results'/key/f'frame-{skin:03d}'
            rgba = np.array(Image.open(folder/'source.png').convert('RGBA'))
            dense = np.load(folder/'class-map.npy',allow_pickle=False)
            if dense.shape != rgba.shape[:2] or dense.dtype != np.uint8 or dense.max() > 24:
                raise ValueError(f'Invalid compact surface map: {folder}')
            frames.append({'rgba':rgba,'dense':dense,'folder':folder})
        baseline = baseline_for(atlas,config)
        reference = frames[baseline]['rgba'][:,:,3]
        validations = []
        for skin,frame in enumerate(frames):
            same_size = frame['rgba'].shape[:2] == reference.shape
            alpha = frame['rgba'][:,:,3]
            validations.append({'skin':skin,'same_size':same_size,
                'exact_alpha':same_size and np.array_equal(reference,alpha),
                'binary_silhouette':same_size and np.array_equal(reference>0,alpha>0),
                'alpha_different_pixels':int(np.count_nonzero(reference!=alpha)) if same_size else None})
        owners = lookup[frames[baseline]['dense']]
        a = reference > 0
        unclipped = owners.copy()
        owners[~a] = 0
        data[key] = {'atlas':atlas,'baseline':baseline,'frames':frames,'alpha':a,
                     'original':owners,'unclipped':unclipped,'alpha_validation':validations}
    return config,inventory,labels,groups,data


def compute(config, groups, data):
    result = {}
    for key,item in data.items():
        if item['atlas']['mirrored']:
            continue
        original,alpha = item['original'],item['alpha']
        variants = {radius:flood(original,alpha,radius,len(groups)) for radius in config['flood_radii']}
        main,ambiguous,distance = variants[config['primary_radius']]
        result[key] = {'original':original,'flood':main,'final':main.copy(),'variants':variants,
                       'ambiguous':ambiguous,'distance':distance,'cross':np.zeros_like(alpha),
                       'conflicts':np.zeros_like(alpha),'proposals':np.zeros_like(original)}
    for pose in dict.fromkeys(item['atlas']['pose'] for item in data.values()):
        south,north = data[f'{pose}/south'],data[f'{pose}/north']
        if south['alpha'].shape != north['alpha'].shape:
            raise ValueError(f'Cross-view native dimensions differ: {pose}')
        row = result[f'{pose}/north']
        final,cross,conflicts,proposals,geometry,unanimous,supported = transfer(
            south['original'],south['alpha'],north['original'],north['alpha'],row['flood'],config['cross_view'],len(groups))
        row.update({'final':final,'cross':cross,'conflicts':conflicts,'proposals':proposals,
                    'geometry':geometry,'unanimous':unanimous,'supported':supported})
    for key,item in data.items():
        if not item['atlas']['mirrored']:
            continue
        west = result[f'{item["atlas"]["pose"]}/{item["atlas"]["source_direction"]}']
        row = {}
        for name,value in west.items():
            row[name] = {radius:tuple(array[:,::-1].copy() for array in values) for radius,values in value.items()} if name == 'variants' else value[:,::-1].copy()
        if not np.array_equal(row['original'],item['original']):
            raise ValueError(f'Mirror source geometry/class IDs differ: {key}')
        result[key] = row
    return result


def counts(original, flood_map, final, alpha, ambiguous, cross, conflicts, groups):
    area = int(alpha.sum())
    stages = {'original':original,'flood':flood_map,'assisted':final}
    values = {f'{name}_coverage':float(np.count_nonzero(array)/area) if area else 0 for name,array in stages.items()}
    values.update({'alpha_pixels':area,'original_pixels':int(np.count_nonzero(original)),
        'original_unassigned':int(np.count_nonzero(alpha & (original==0))),
        'original_preserved':int(np.count_nonzero(original)),
        'flood_pixels':int(np.count_nonzero((flood_map>0)&(original==0))),
        'cross_view_pixels':int(cross.sum()),'unknown_pixels':int(np.count_nonzero(alpha & (final==0))),
        'ambiguous_pixels':int(ambiguous.sum()),'cross_view_conflicts':int(conflicts.sum())})
    values['groups'] = {name:{**{stage:int(np.count_nonzero(array==i)) for stage,array in stages.items()},
        'flood_added':int(np.count_nonzero((flood_map==i)&(original==0))),
        'cross_added':int(np.count_nonzero(cross & (final==i)))} for i,name in enumerate(groups,1)}
    return values


def protected_paths():
    command = ['git','-c','core.quotepath=false','ls-files','--','experiments/densepose-full-character-v1.0.0',
               'experiments/anatomy-benchmark-v1.0.0','godot','.agents']
    paths = subprocess.check_output(command,cwd=REPO,text=True,encoding='utf-8').splitlines()
    return {path:sha(REPO/path) for path in paths if (REPO/path).is_file()}


def run():
    from render import save_all
    config,inventory,labels,groups,data = load_inputs()
    before = protected_paths()
    compact = {str(frame['folder'].relative_to(REPO)/name):sha(frame['folder']/name)
               for item in data.values() for frame in item['frames'] for name in ['source.png','class-map.npy']}
    manifest = {'version':'1.0.0','config':config,'protected_files':before,'compact_inputs':compact,
                'raw_required':False,'neural_inference':False,
                'source_metadata':{name:sha((ROOT/config['source'])/name) for name in ['source-inventory.json','labels.json','model.json','summary.json']}}
    if (ROOT/'source-manifest.json').exists() and read(ROOT/'source-manifest.json') != manifest:
        raise ValueError('Input/config contract changed; do not overwrite completed experiment')
    write(ROOT/'source-manifest.json',manifest)
    result = compute(config,groups,data)
    repeated = compute(config,groups,data)
    for key,row in result.items():
        for name,value in row.items():
            if name == 'variants':
                for radius,arrays in value.items():
                    assert all(np.array_equal(a,b) for a,b in zip(arrays,repeated[key][name][radius]))
            else:
                assert np.array_equal(value,repeated[key][name]), (key,name)
        for radius,(owners,ambiguous,distance) in row['variants'].items():
            invariants(row['original'],owners,data[key]['alpha'],provenance(owners,row['original'],data[key]['alpha']))
        invariants(row['original'],row['final'],data[key]['alpha'],provenance(row['final'],row['original'],data[key]['alpha'],row['cross']))
    metrics = save_all(config,inventory,labels,groups,data,result)
    assert protected_paths() == before
    assert all(sha(REPO/p)==value for p,value in compact.items())
    write(ROOT/'metrics.json',{'version':'1.0.0','frames':metrics})
    write(ROOT/'verification.json',{'version':'1.0.0','protected_files_unchanged':len(before),
        'compact_inputs_unchanged':len(compact),'atlases_checked':len(data),'frames':len(metrics),
        'A_original_visible_owners_preserved':True,'B_no_owner_outside_alpha':True,'C_original_textures_unchanged':True,
        'D_two_independent_computations_bitwise_equal':True,'E_skin_geometry_checked':True,
        'F_mirrors_exact':True,'G_equal_distance_unknown':True,'H_no_seed_no_flood':True,
        'raw_archives_accessed':False,'neural_inference':False})
    from report import report
    report(config,groups,data,metrics)
    print(f'Complete: {len(data)} atlases, {len(metrics)} frames, protected {len(before)} files')


if __name__ == '__main__':
    run()
