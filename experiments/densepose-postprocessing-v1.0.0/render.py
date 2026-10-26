"""Separate anatomical/provenance palettes and readable native-pixel comparisons."""
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

from core import ROOT, read, write, flood, transform, provenance, components, CROSS, UNKNOWN

PROVENANCE_COLORS = np.array([[32,34,39],[90,110,145],[255,190,25],[20,235,235],[255,40,150]],dtype=np.uint8)


def npy(path, array):
    path = Path(path)
    path.parent.mkdir(parents=True,exist_ok=True)
    if path.exists():
        if not np.array_equal(np.load(path,allow_pickle=False),array):
            raise FileExistsError(f'Refusing changed completed array: {path}')
    else:
        np.save(path,array,allow_pickle=False)


def png(path, array):
    path = Path(path)
    path.parent.mkdir(parents=True,exist_ok=True)
    im = array if isinstance(array,Image.Image) else Image.fromarray(array)
    if path.exists():
        if not np.array_equal(np.array(Image.open(path)),np.array(im)):
            raise FileExistsError(f'Refusing changed completed PNG: {path}')
    else:
        im.save(path)


def mask(path, value):
    png(path,(value.astype(np.uint8)*255))


def palette(labels, groups):
    return np.array([[32,34,39]]+[labels['palette_rgb'][name] for name in groups],dtype=np.uint8)


def overlay(rgba, owners, colors):
    out = rgba.copy()
    labelled = owners > 0
    out[labelled,:3] = ((rgba[labelled,:3].astype(np.uint16)+colors[owners[labelled]].astype(np.uint16))//2).astype(np.uint8)
    return out


def page(path, rows, headings):
    cell, top, left = 150,40,130
    out = Image.new('RGB',(left+len(headings)*cell,top+len(rows)*(cell+20)),(28,30,35))
    draw = ImageDraw.Draw(out)
    for index,title in enumerate(headings):
        draw.text((left+index*cell+3,8),title,fill='white')
    for row,(title,images) in enumerate(rows):
        y = top+row*(cell+20)
        draw.text((4,y+5),title,fill='white')
        for col,array in enumerate(images):
            im = array if isinstance(array,Image.Image) else Image.fromarray(np.asarray(array,dtype=np.uint8))
            if im.mode == 'RGBA':
                background = Image.new('RGBA',im.size,(105,105,105,255))
                im = Image.alpha_composite(background,im).convert('RGB')
            out.paste(im,(left+col*cell+(cell-im.width)//2,y+(cell-im.height)//2))
    png(path,out)


def geometry_diagnostics(pose, south, north, config, colors):
    folder = ROOT/'cross-view'/pose
    shift = config['cross_view']['diagnostic_shift_range']
    metrics,views = [], []
    alternatives = np.zeros_like(north['original'],dtype=np.uint16)
    for mirror in [False,True]:
        for dy in range(-shift,shift+1):
            for dx in range(-shift,shift+1):
                hypothesis = {'mirror':mirror,'dx':dx,'dy':dy}
                donor = transform(south['alpha'],**hypothesis)
                owners = transform(south['original'],**hypothesis)
                target = north['alpha']
                intersection,union = int((donor&target).sum()),int((donor|target).sum())
                conflicts = target & donor & (owners>0) & (north['original']>0) & (owners!=north['original'])
                name = f'{"flip" if mirror else "identity"}-dx{dx:+d}-dy{dy:+d}'
                rgb = np.zeros((*target.shape,3),dtype=np.uint8)
                rgb[donor & ~target] = [255,90,30]
                rgb[target & ~donor] = [20,160,255]
                rgb[target & donor] = [210,210,210]
                png(folder/'hypotheses'/name/'silhouette-overlay.png',rgb)
                mask(folder/'hypotheses'/name/'differences.png',donor^target)
                mask(folder/'hypotheses'/name/'intersection.png',donor&target)
                mask(folder/'hypotheses'/name/'conflicts.png',conflicts)
                npy(folder/'hypotheses'/name/'owners-proposal.npy',owners)
                agreement = target & donor & (owners>0) & (north['original']>0)
                group_agreement = {str(i):{'co_labeled':int(np.count_nonzero(agreement & (owners==i))),
                    'same_group':int(np.count_nonzero(agreement & (owners==i) & (north['original']==i)))} for i in range(1,len(colors))}
                metrics.append({'name':name,'transform':hypothesis,'intersection':intersection,
                    'symmetric_difference':int((donor^target).sum()),'iou':intersection/union if union else 1,
                    'dice':2*intersection/int(donor.sum()+target.sum()) if donor.any() or target.any() else 1,
                    'conflicts':int(conflicts.sum()),'group_agreement':group_agreement})
                if dx == 0 and dy == 0:
                    views.append((name,[rgb,colors[owners],np.repeat((conflicts*255)[:,:,None],3,axis=2)]))
                    for i in range(1,len(colors)):
                        alternatives[owners==i] |= np.uint16(1 << (i-1))
    npy(folder/'alternative-owner-bitset.npy',alternatives)
    write(folder/'geometry.json',{'version':'1.0.0','hypotheses':metrics,'automatic_winner_selected':False,
        'transfer_hypotheses':config['cross_view']['transfer_hypotheses'],
        'side_convention':'DensePose intrinsic anatomical L/R; no ID swaps under reflection',
        'silhouette_similarity_does_not_establish_anatomical_identity':True})
    page(folder/'geometry-comparison.png',views,['Silhouettes','Donor owners','Conflicts'])


def save_all(config,inventory,labels,groups,data,result):
    colors = palette(labels,groups)
    legend = Image.new('RGB',(740,470),(28,30,35))
    draw = ImageDraw.Draw(legend)
    draw.text((10,10),'Anatomical owners (intrinsic L/R)',fill='white')
    draw.text((390,10),'Pixel provenance (separate palette)',fill='white')
    for i,name in enumerate(groups,1):
        y=35+(i-1)*29
        draw.rectangle((10,y,30,y+18),fill=tuple(colors[i]))
        draw.text((40,y+2),f'{i}: {name}',fill='white')
    for i,name in enumerate(['Background','Original DensePose baseline','Flood Fill','Cross-view transfer','Unknown']):
        y=35+i*29
        draw.rectangle((390,y,410,y+18),fill=tuple(PROVENANCE_COLORS[i]))
        draw.text((420,y+2),f'{i}: {name}',fill='white')
    png(ROOT/'legend.png',legend)
    write(ROOT/'labels.json',{'version':'1.0.0','owners':{str(i):name for i,name in enumerate(['Unknown',*groups])},
        'densepose_groups':labels['groups'],'anatomy_palette':colors.tolist(),
        'provenance':{'0':'Background','1':'Original DensePose (selected baseline)','2':'Flood Fill','3':'Cross-view transfer','4':'Unknown'},
        'provenance_palette':PROVENANCE_COLORS.tolist()})
    metrics = []
    pose_rows,group_rows = {},{}
    for key,item in data.items():
        row = result[key]
        folder = ROOT/'alpha-validation'/key
        write(folder/'alpha-comparison.json',{'version':'1.0.0','baseline_frame':item['baseline'],'frames':item['alpha_validation']})
        for skin,validation in enumerate(item['alpha_validation']):
            if validation['same_size']:
                alpha = item['frames'][skin]['rgba'][:,:,3]
                reference = item['frames'][item['baseline']]['rgba'][:,:,3]
                mask(folder/f'frame-{skin:03d}-alpha-difference.png',alpha!=reference)
                mask(folder/f'frame-{skin:03d}-binary-difference.png',(alpha>0)!=(reference>0))
        for radius,(owners,ambiguous,distance) in row['variants'].items():
            out = ROOT/'flood-fill'/key/f'flood-r{radius}'
            npy(out/'anatomical-owners.npy',owners)
            npy(out/'provenance.npy',provenance(owners,row['original'],item['alpha']))
            npy(out/'geodesic-distance.npy',distance)
            mask(out/'unknown-mask.png',item['alpha'] & (owners==0))
            mask(out/'ambiguous-mask.png',ambiguous)
        region_metrics = components(item['alpha'] & (row['original']==0),row['original'])
        variant_metrics = {str(radius):{'filled':int(np.count_nonzero((owners>0)&(row['original']==0))),
            'unknown':int(np.count_nonzero(item['alpha']&(owners==0))), 'ambiguous':int(amb.sum()),
            'new_pixels_per_group':{name:int(np.count_nonzero((owners==i)&(row['original']==0))) for i,name in enumerate(groups,1)},
            'unknown_components':components(item['alpha']&(owners==0))} for radius,(owners,amb,dist) in row['variants'].items()}
        write(ROOT/'flood-fill'/key/'regions.json',{'version':'1.0.0','original_unknown_regions':region_metrics,'variants':variant_metrics})
        atlas_canvases = {name:Image.new('RGBA',tuple(item['atlas']['atlas_size']),(0,0,0,0))
                          for name in ['source','original','flood','final','provenance','added','conflicts']}
        saved_owners = []
        for skin,frame in enumerate(item['frames']):
            out = ROOT/'results'/key/f'frame-{skin:03d}'
            confirmed = item['alpha_validation'][skin]['binary_silhouette']
            a = frame['rgba'][:,:,3]>0
            original = row['original'] if confirmed else np.zeros(a.shape,dtype=np.uint8)
            filled = row['flood'] if confirmed else original
            final = row['final'] if confirmed else original
            cross = row['cross'] if confirmed else np.zeros_like(a)
            ambiguous = row['ambiguous'] if confirmed else np.zeros_like(a)
            conflicts = row['conflicts'] if confirmed else np.zeros_like(a)
            prov = provenance(final,original,a,cross)
            png(out/'source.png',frame['rgba'])
            npy(out/'densepose-original.npy',frame['dense'])
            npy(out/'densepose-baseline.npy',item['frames'][item['baseline']]['dense'])
            npy(out/'owners-densepose-unclipped.npy',item['unclipped'])
            for name,array in [('original',original),('flood',filled),('final',final)]:
                npy(out/f'owners-{name}.npy',array)
                png(out/f'overlay-{name}.png',overlay(frame['rgba'],array,colors))
                png(out/f'owners-{name}.png',colors[array])
            npy(out/'anatomical-owners.npy',final)
            npy(out/'provenance.npy',prov)
            png(out/'provenance.png',PROVENANCE_COLORS[prov])
            mask(out/'unknown-mask.png',a&(final==0))
            mask(out/'ambiguous-mask.png',ambiguous & (final==0))
            mask(out/'flood-ambiguous-mask.png',ambiguous)
            mask(out/'flood-added.png',(filled>0)&(original==0))
            mask(out/'cross-added.png',cross)
            for i,name in enumerate(groups,1):
                mask(out/'masks'/f'{name}.png',final==i)
            if item['atlas']['direction'] == 'north':
                npy(out/'owners-south-assisted.npy',final)
                npy(out/'cross-view-proposals.npy',row['proposals'])
                mask(out/'cross-view-conflicts.png',conflicts)
                png(out/'north-transfer-provenance.png',PROVENANCE_COLORS[prov])
            from pipeline import counts
            measured = counts(original,filled,final,a,ambiguous&(final==0),cross,conflicts,groups)
            metadata = {'version':'1.0.0','key':f'{key}/frame-{skin:03d}',
                'baseline_key':f'{key}/frame-{item["baseline"]:03d}', 'geometry_confirmed':confirmed,
                'mirrored':item['atlas']['mirrored'],'source_direction':item['atlas']['source_direction'],
                'historical_densepose_preserved':True,'baseline_densepose_outside_alpha':int(np.count_nonzero((item['unclipped']>0) & ~item['alpha'])),
                'primary_flood_radius':config['primary_radius'],'metrics':measured,'flood_variants':variant_metrics,
                'no_detection_in_own_historical_map':not bool(frame['dense'].any()),
                'shared_baseline_is_original_owner_reference':True}
            write(out/'metadata.json',metadata)
            metrics.append(metadata)
            saved_owners.append(final)
            assert np.array_equal(np.array(Image.open(out/'source.png')),frame['rgba'])
            assert np.array_equal(np.load(out/'densepose-original.npy'),frame['dense'])
            images = {'source':frame['rgba'],'original':colors[original], 'flood':colors[filled],
                      'final':colors[final],'provenance':PROVENANCE_COLORS[prov],
                      'added':np.where(cross[:,:,None],[20,235,235],np.where(((filled>0)&(original==0))[:,:,None],[255,190,25],[32,34,39])).astype(np.uint8),
                      'conflicts':np.where(conflicts[:,:,None],[255,50,50],[32,34,39]).astype(np.uint8)}
            w,h = item['atlas']['frame_size']
            for name,canvas in atlas_canvases.items():
                canvas.paste(Image.fromarray(images[name]).convert('RGBA'),((skin%item['atlas']['hframes'])*w,(skin//item['atlas']['hframes'])*h))
        if all(v['binary_silhouette'] for v in item['alpha_validation']):
            assert all(np.array_equal(saved_owners[0],owner) for owner in saved_owners)
        for name,canvas in atlas_canvases.items():
            png(ROOT/'atlases'/key/f'{name}.png',canvas)
        skin = item['baseline']
        rgba = item['frames'][skin]['rgba']
        prov = provenance(row['final'],row['original'],item['alpha'],row['cross'])
        direction = item['atlas']['direction']
        pose = item['atlas']['pose']
        added = np.where(row['cross'][:,:,None],[20,235,235],np.where(((row['flood']>0)&(row['original']==0))[:,:,None],[255,190,25],[32,34,39])).astype(np.uint8)
        conflict_rgb = np.where(row['conflicts'][:,:,None],[255,50,50],[32,34,39]).astype(np.uint8)
        pose_rows.setdefault(pose,[]).append((direction,[rgba,colors[row['original']],colors[row['flood']],colors[row['final']],added,PROVENANCE_COLORS[prov],conflict_rgb]))
        page(ROOT/'comparisons/flood'/pose/f'{direction}.png',[(f'r{radius}',[rgba,colors[owners],np.repeat((amb*255)[:,:,None],3,axis=2)]) for radius,(owners,amb,dist) in row['variants'].items()],['Source','Owners','Equal-distance ties'])
        categories = {'Head':['Head'],'Torso':['Torso'],'Upper-Arms':['Left_Upper_Arm','Right_Upper_Arm'],
            'Lower-Arms':['Left_Lower_Arm','Right_Lower_Arm'],'Upper-Legs':['Left_Upper_Leg','Right_Upper_Leg'],
            'Lower-Legs':['Left_Lower_Leg','Right_Lower_Leg'],'Hands':['Left_Hand','Right_Hand'],'Feet':['Left_Foot','Right_Foot']}
        for title,names in categories.items():
            ids = [groups.index(name)+1 for name in names]
            imgs = [colors[np.where(np.isin(array,ids),array,0)] for array in [row['original'],row['flood'],row['final']]]
            group_rows.setdefault((pose,title),[]).append((direction,[rgba,*imgs]))
        print(f'Saved {key}: five skin variants',flush=True)
    for pose,rows in pose_rows.items():
        page(ROOT/'comparisons/by-pose'/f'{pose}.png',rows,['Source','Original owners','Flood r2','Final','Added F / X','Provenance','Conflicts'])
        south,north = data[f'{pose}/south'],data[f'{pose}/north']
        geometry_diagnostics(pose,south,north,config,colors)
        row = result[f'{pose}/north']
        comparison = [r for r in rows if r[0]=='north']
        page(ROOT/'cross-view'/pose/'north-comparison.png',comparison,['Source','north-original','north-flood-only','south-assisted','Added F / X','Provenance','Conflicts'])
        for name,array in [('north-original',row['original']),('north-flood-only',row['flood']),('north-south-assisted',row['final'])]:
            npy(ROOT/'cross-view'/pose/f'{name}.npy',array)
        mask(ROOT/'cross-view'/pose/'north-conflicts.png',row['conflicts'])
        png(ROOT/'cross-view'/pose/'north-transfer-provenance.png',PROVENANCE_COLORS[provenance(row['final'],row['original'],north['alpha'],row['cross'])])
        for gate in ['geometry','unanimous','supported','cross']:
            mask(ROOT/'cross-view'/pose/f'{gate}-gate.png',row[gate])
    for (pose,title),rows in group_rows.items():
        page(ROOT/'comparisons/groups'/title/f'{pose}.png',rows,['Source','Original owners','Flood r2','Final'])
    return metrics
