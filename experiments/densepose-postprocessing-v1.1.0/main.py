"""Full CPU-only Character1 convergence pass and order-permuted replay."""
import subprocess
import numpy as np

from flood import converge,mirror_result
from io_support import ROOT,REPO,read,write,sha,load,invariants,provenance


def protected():
    paths = subprocess.check_output(['git','-c','core.quotepath=false','ls-files','--',
        'experiments/densepose-postprocessing-v1.0.0','experiments/densepose-full-character-v1.0.0',
        'experiments/anatomy-benchmark-v1.0.0','godot','.agents'],cwd=REPO,text=True,encoding='utf-8').splitlines()
    return {p:sha(REPO/p) for p in paths if (REPO/p).is_file()}


def calculate(data, reverse=False):
    results = {}
    for key,item in data.items():
        if not item['atlas']['mirrored']:
            results[key] = converge(item['original'],item['alpha'],reverse_seeds=reverse,reverse_pixels=reverse)
    for key,item in data.items():
        if item['atlas']['mirrored']:
            source_key = f'{item["atlas"]["pose"]}/{item["atlas"]["source_direction"]}'
            results[key] = mirror_result(results[source_key])
            assert np.array_equal(results[key]['owners'][item['original']>0],item['original'][item['original']>0])
    return results


def run():
    config,inventory,labels,groups,data = load()
    used = {}
    for item in data.values():
        for path in [item['dense_path'],item['r2_path'],*[f['path'] for f in item['frames']]]:
            used[str(path.relative_to(REPO))] = sha(path)
    before = protected()
    manifest = {'version':'1.1.0','config':config,'compact_inputs':used,'protected_files':before,
                'raw_archives_required':False,'neural_inference':False,'cross_view_transfer':False}
    target = ROOT/'source-manifest.json'
    if target.exists() and read(target)!=manifest:
        raise ValueError('Input/configuration changed; refusing to replace existing results')
    write(target,manifest)
    results,replay = calculate(data),calculate(data,reverse=True)
    for key,result in results.items():
        for name in ['owners','distance','tie_direction','tie_mask','unknown']:
            np.testing.assert_array_equal(result[name],replay[key][name])
        item=data[key]
        p=provenance(result['owners'],item['original'],item['alpha'])
        invariants(item['original'],result['owners'],item['alpha'],p)
        assert not np.any(result['unknown']&(result['distance']>=0))
        assert np.all(p!=3), 'Cross-view provenance is forbidden'
    from outputs import save
    metrics = save(config,inventory,labels,groups,data,results)
    write(ROOT/'metrics.json',{'version':'1.1.0','frames':metrics})
    assert protected()==before
    assert all(sha(REPO/path)==value for path,value in used.items())
    write(ROOT/'verification.json',{'version':'1.1.0','protected_files_unchanged':len(before),
        'compact_inputs_unchanged':len(used),'frames':len(metrics),'independent_bfs_runs':32,
        'mirrored_geometries':16,'order_permuted_replay_bitwise_equal':True,
        'original_owners_preserved':True,'no_owner_outside_alpha':True,
        'no_reachable_unassigned_pixels':True,'cross_view_transfer':False,'neural_inference':False})
    from reporting import report
    report(data,metrics)
    print(f'Complete: {len(metrics)} frames; 32 independent BFS passes and 16 exact reflections')


if __name__=='__main__':
    run()
