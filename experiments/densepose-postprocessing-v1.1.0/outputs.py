"""Save native arrays, source references, unreachable regions and comparisons."""
import numpy as np
from PIL import Image
from flood import unreachable_components
from io_support import (ROOT,read,write,npy,png,mask,page,palette,overlay,provenance,PROVENANCE_COLORS)


def measure(original,r2,result,alpha,groups):
    filled = (original==0)&(result['owners']>0)
    distances = result['distance'][filled]
    values,counts = np.unique(distances,return_counts=True)
    area = int(alpha.sum())
    return {'alpha_pixels':area,'original_pixels':int(np.count_nonzero(original)),
        'historical_r2_pixels':int(np.count_nonzero(r2)),
        'filled_pixels':int(filled.sum()),'total_owned':int(np.count_nonzero(result['owners'])),
        'tiebreak_pixels':int(result['tie_mask'].sum()),'unknown_pixels':int(result['unknown'].sum()),
        'max_distance':int(distances.max()) if distances.size else 0,
        'mean_distance':float(distances.mean()) if distances.size else 0,
        'distance_histogram':{str(int(d)):int(n) for d,n in zip(values,counts)},
        'max_bfs_depth':result['max_depth'],'assignments_per_wave':result['wave_counts'],
        'terminal_delta':result['terminal_delta'],'stop_reason':result['stop_reason'],
        'groups':{name:{'original':int(np.count_nonzero(original==i)),
                       'historical_r2':int(np.count_nonzero(r2==i)),
                       'filled':int(np.count_nonzero(result['owners']==i)),
                       'added':int(np.count_nonzero(filled&(result['owners']==i)))} for i,name in enumerate(groups,1)}}


def save(config,inventory,labels,groups,data,results):
    colors=palette(labels,groups)
    metrics,pose_pages = [],{}
    write(ROOT/'labels.json',{'version':'1.1.0','groups':labels['groups'],'owner_ids':{str(i):name for i,name in enumerate(['Unknown',*groups])},
        'palette_rgb':labels['palette_rgb'],'direction_codes':{'0':'NONE','1':'N','2':'E','3':'S','4':'W'},
        'provenance':{'0':'Background','1':'Original DensePose baseline','2':'Flood Fill','4':'Unknown'},
        'mirror_direction_mapping':{'0':0,'1':1,'2':4,'3':3,'4':2}})
    for key,item in data.items():
        result=results[key]
        original,r2,alpha=item['original'],item['r2'],item['alpha']
        regions=unreachable_components(result['unknown'])
        common=ROOT/'geometry'/key
        write(common/'unreachable-regions.json',{'version':'1.1.0','regions':regions})
        for region in regions:
            binary=np.zeros_like(alpha)
            for x,y in region['coordinates_xy']:
                binary[y,x]=True
            mask(common/f'unreachable-region-{region["id"]:03d}.png',binary)
        write(common/'alpha-validation.json',{'version':'1.1.0','baseline_frame':item['baseline'],
              'binary_silhouettes_equal':True,
              'exact_alpha_equal':[bool(np.array_equal(f['rgba'][:,:,3],item['frames'][item['baseline']]['rgba'][:,:,3])) for f in item['frames']]})
        canvases={name:Image.new('RGBA',tuple(item['atlas']['atlas_size']),(0,0,0,0)) for name in
                  ['source','original','historical-r2','convergence','added','clockwise-ties','unknown','provenance']}
        p=provenance(result['owners'],original,alpha)
        measured=measure(original,r2,result,alpha,groups)
        new=(result['owners']>0)&(original==0)
        added=np.where(new[:,:,None],[255,190,25],[30,32,37]).astype(np.uint8)
        ties=np.where(result['tie_mask'][:,:,None],[20,235,235],[30,32,37]).astype(np.uint8)
        unknown=np.where(result['unknown'][:,:,None],[255,40,150],[30,32,37]).astype(np.uint8)
        for skin,frame in enumerate(item['frames']):
            out=ROOT/'results'/key/f'frame-{skin:03d}'
            png(out/'source.png',frame['rgba'])
            for name,array in [('owners-original',original),('owners-filled',result['owners']),('provenance',p),
                               ('flood-distance',result['distance']),('clockwise-tiebreak-direction',result['tie_direction'])]:
                npy(out/f'{name}.npy',array)
            mask(out/'clockwise-tiebreak-mask.png',result['tie_mask'])
            mask(out/'unknown-mask.png',result['unknown'])
            png(out/'overlay-original.png',overlay(frame['rgba'],original,colors))
            png(out/'overlay-filled.png',overlay(frame['rgba'],result['owners'],colors))
            for i,name in enumerate(groups,1):
                mask(out/'masks'/f'{name}.png',result['owners']==i)
            metadata={'version':'1.1.0','key':f'{key}/frame-{skin:03d}','baseline_frame':item['baseline'],
                'source_rgba':str(frame['path']),'original_surface_map_reference':str(item['dense_path']),
                'historical_r2_reference':str(item['r2_path']),'historical_r2_recomputed':False,
                'baseline_owner_scope':'selected shared baseline clipped to binary alpha; historical 24-surface maps untouched',
                'mirrored':item['atlas']['mirrored'],'source_direction':item['atlas']['source_direction'],
                'mirror_method':'reflect finished western maps; exchange E/W direction codes only' if item['atlas']['mirrored'] else None,
                'cross_view_transfer':False,'unreachable_regions_reference':f'geometry/{key}/unreachable-regions.json',
                'metrics':measured}
            write(out/'metadata.json',metadata)
            metrics.append(metadata)
            images={'source':frame['rgba'],'original':colors[original],'historical-r2':colors[r2],
                    'convergence':colors[result['owners']],'added':added,'clockwise-ties':ties,'unknown':unknown,
                    'provenance':PROVENANCE_COLORS[p]}
            w,h=item['atlas']['frame_size']
            for name,canvas in canvases.items():
                canvas.paste(Image.fromarray(images[name]).convert('RGBA'),((skin%item['atlas']['hframes'])*w,(skin//item['atlas']['hframes'])*h))
        for name,canvas in canvases.items():
            png(ROOT/'atlases'/key/f'{name}.png',canvas)
        baseline_rgba=item['frames'][item['baseline']]['rgba']
        visuals=[baseline_rgba,colors[original],colors[r2],colors[result['owners']],added,ties,unknown]
        pose_pages.setdefault(item['atlas']['pose'],[]).append((item['atlas']['direction'],visuals))
        page(ROOT/'comparisons/by-atlas'/f'{key}.png',[(key,visuals)],['Source','Original DensePose','v1.0 historical r2','v1.1 convergence','Added pixels','Clockwise ties','Unknown'])
        print(f'Saved {key}: {measured["unknown_pixels"]} unknown, BFS depth {measured["max_bfs_depth"]}',flush=True)
    for pose,rows in pose_pages.items():
        page(ROOT/'comparisons/by-pose'/f'{pose}.png',rows,['Source','Original DensePose','v1.0 historical r2','v1.1 convergence','Added pixels','Clockwise ties','Unknown'])
    return metrics
