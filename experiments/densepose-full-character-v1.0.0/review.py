"""Deterministic diagnostics and paginated inspection assets, never corrections."""
from collections import defaultdict
from pathlib import Path
from pathlib import PureWindowsPath
import statistics
import subprocess

import numpy as np
from PIL import Image, ImageDraw, ImageFont

from core import ROOT, REPO, OLD, GROUPS, COLORS, read, write, sha, frame, result_path, adapter_hash, project
from artifacts import color_map


def font(size):
    try: return ImageFont.truetype('C:/Windows/Fonts/arial.ttf',size)
    except OSError: return ImageFont.load_default(size=size)


def matte(image):
    image = image.convert('RGBA')
    canvas = Image.new('RGBA',image.size,(52,55,63,255))
    canvas.alpha_composite(image)
    return canvas.convert('RGB')


def surface_components(labels):
    """Count four-connected native surfaces without modifying a label."""
    visited = np.zeros(labels.shape,dtype=bool)
    counts = {str(i):0 for i in range(1,25)}
    height,width = labels.shape
    for y,x in np.argwhere(labels>0):
        if visited[y,x]: continue
        owner = int(labels[y,x])
        counts[str(owner)]+=1
        visited[y,x] = True
        stack = [(int(y),int(x))]
        while stack:
            cy,cx = stack.pop()
            for ny,nx in [(cy-1,cx),(cy+1,cx),(cy,cx-1),(cy,cx+1)]:
                if 0<=ny<height and 0<=nx<width and not visited[ny,nx] and labels[ny,nx]==owner:
                    visited[ny,nx] = True
                    stack.append((ny,nx))
    return counts


def grid(entries, records, row_field, title, path, family=None):
    rows = list(dict.fromkeys(e[row_field] for e in entries))
    columns = max(e['atlas_frame'] for e in entries)+1
    canvas = Image.new('RGB',(150+180*columns,60+200*len(rows)),(29,32,39))
    draw = ImageDraw.Draw(canvas)
    draw.text((12,8),title,font=font(16),fill='white')
    for index in range(columns): draw.text((150+index*180,37),f'frame {index:03d} / skin {index+1}',font=font(12),fill='white')
    for row,label in enumerate(rows):
        draw.text((8,75+row*200),label,font=font(15),fill='white')
        for entry in [e for e in entries if e[row_field]==label]:
            key = entry['key']
            left,top = 150+entry['atlas_frame']*180,80+row*200
            record = records.get(key)
            if not record or record['status']!='SUCCESS':
                draw.text((left+20,top+45),'PENDING' if not record else 'ERROR',font=font(17),fill=(250,160,100))
                continue
            folder = result_path(entry)
            if family:
                labels = np.load(folder/'class-map.npy')
                allowed = [i for name,ids in GROUPS.items() if family in name for i in ids]
                image = matte(color_map(np.where(np.isin(labels,allowed),labels,0)))
            else: image = Image.open(folder/'overlay.png').convert('RGB')
            canvas.paste(image,(left+(150-image.width)//2,top+(150-image.height)//2))
            tag = 'mirror' if entry['mirrored'] else 'inference'
            draw.text((left,top+154),tag,font=font(11),fill=(170,190,210))
            score = record['detections']['selected_score']
            draw.text((left,top+170),'score '+('none' if score is None else f'{score:.3f}'),font=font(11),fill='white')
    path.parent.mkdir(parents=True,exist_ok=True)
    canvas.save(path)


def preprocessing_table():
    base = ROOT/'preprocess-comparison'
    if not (base/'preflight.json').exists(): return
    controls = read(base/'preflight.json')['controls']
    directions = list(dict.fromkeys(r['direction'] for r in controls))
    canvas = Image.new('RGB',(1050,60+210*len(directions)),(29,32,39))
    draw = ImageDraw.Draw(canvas)
    draw.text((10,8),'Preprocessing controls | A: legacy bicubic512 | B: direct source pixels',font=font(16),fill='white')
    for row,direction in enumerate(directions):
        draw.text((10,70+row*210),direction,font=font(14),fill='white')
        for column,method in enumerate(['bicubic512','direct']):
            folder = base/direction/method
            metadata = read(folder/'metadata.json')
            for sub,name in enumerate(['class-map-preview.png','overlay.png']):
                image = matte(Image.open(folder/name))
                x,y = 150+column*440+sub*170,85+row*210
                canvas.paste(image,(x+(150-image.width)//2,y+(150-image.height)//2))
            d = metadata['diagnostics']
            score = metadata['detections']['selected_score']
            draw.text((150+column*440,65+row*210),method+' score='+('none' if score is None else f'{score:.4f}'),font=font(13),fill='white')
            draw.text((150+column*440,245+row*210),f"covered {d['visible_pixels_segmented']}/{d['source_alpha_pixels']}; outside {d['predicted_pixels_outside_alpha']}",font=font(11),fill='white')
    canvas.save(base/'comparison.png')


def diagnostic_warnings(entries, records):
    config = read(ROOT/'config.json')['diagnostics']
    warnings = []
    for entry in entries:
        record = records.get(entry['key'])
        if not record or record['status']!='SUCCESS': continue
        stats = record['diagnostics']
        if record['detections']['count']==0: warnings.append({'key':entry['key'],'type':'no_detection'})
        for name,group in stats['groups'].items():
            if group['pixels']>stats['source_alpha_pixels']*config['dominant_group_fraction']:
                warnings.append({'key':entry['key'],'type':'group_dominates_source_silhouette','group':name})
        if stats['predicted_pixels_outside_alpha']>stats['source_alpha_pixels']*config['coverage_change']:
            warnings.append({'key':entry['key'],'type':'substantial_outside_alpha'})
    grouped = defaultdict(list)
    for entry in entries: grouped[(entry['pose'],entry['direction'])].append(entry)
    for group in grouped.values():
        group.sort(key=lambda e:e['atlas_frame'])
        for previous,current in zip(group,group[1:]):
            a,b = records.get(previous['key']),records.get(current['key'])
            if not a or not b or a['status']!='SUCCESS' or b['status']!='SUCCESS': continue
            da,db = a['diagnostics'],b['diagnostics']
            context = {'key':current['key'],'previous':previous['key'],'comparison_axis':'adjacent skin-tone variants, NOT animation time'}
            if abs((da['coverage'] or 0)-(db['coverage'] or 0))>config['coverage_change']:
                warnings.append(dict(context,type='variant_coverage_jump'))
            for name in GROUPS:
                ga,gb = da['groups'][name],db['groups'][name]
                if ga['pixels'] and not gb['pixels']: warnings.append(dict(context,type='variant_group_disappeared',group=name))
                fraction_change = abs(ga['visible_pixels']/max(da['source_alpha_pixels'],1)-gb['visible_pixels']/max(db['source_alpha_pixels'],1))
                if fraction_change>config['area_fraction_change']: warnings.append(dict(context,type='variant_group_area_jump',group=name))
            ma = np.load(result_path(previous)/'class-map.npy')
            mb = np.load(result_path(current)/'class-map.npy')
            for part in ['Upper_Arm','Lower_Arm','Upper_Leg','Lower_Leg']:
                al,ar = np.isin(ma,GROUPS['Left_'+part]),np.isin(ma,GROUPS['Right_'+part])
                bl,br = np.isin(mb,GROUPS['Left_'+part]),np.isin(mb,GROUPS['Right_'+part])
                if all(m.any() for m in [al,ar,bl,br]) and (al & br).sum()>(al & bl).sum() and (ar & bl).sum()>(ar & br).sum():
                    warnings.append(dict(context,type='possible_variant_left_right_exchange',group=part))
            head = np.isin(ma,GROUPS['Head'])
            if head.any() and (head & np.isin(mb,GROUPS['Torso'])).sum()>(head & np.isin(mb,GROUPS['Head'])).sum():
                warnings.append(dict(context,type='possible_variant_head_to_torso_reassignment'))
    return warnings


def render():
    inventory = read(ROOT/'source-inventory.json')
    entries = inventory['frames']
    records = {e['key']:read(result_path(e)/'metadata.json') for e in entries if (result_path(e)/'metadata.json').exists()}
    model = read(ROOT/'model.json')
    for entry in entries:
        record = records.get(entry['key'])
        if not record or record['status']!='SUCCESS': continue
        geometry_path = result_path(entry)/'native/geometry.json'
        if geometry_path.exists(): continue
        if entry['mirrored']:
            geometry = {'execution':'spatial_mirror','transform':record['transform'],'source_geometry':record['mirrored_from']+'/native/geometry.json'}
        else:
            transform = record['transform']
            width,height = transform['predictor_input_size']
            scale = model['preprocessing']['min_size_test']/min(width,height)
            if max(width,height)*scale>model['preprocessing']['max_size_test']:
                scale = model['preprocessing']['max_size_test']/max(width,height)
            internal = [int(width*scale+0.5),int(height*scale+0.5)]
            geometry = {'external_transform':transform,'detectron2_internal_resize':{'input_size':[width,height],'output_size':internal,
                         'interpolation':'DefaultPredictor ResizeShortestEdge bilinear','scale_xy':[internal[0]/width,internal[1]/height]},
                        'predictor_postprocess':'Detectron2 returns boxes in predictor-input coordinates; official chart converter uses those boxes.',
                        'roi_outputs':{name:spec['shape'] for name,spec in record['raw_tensors'].items() if name.startswith('instance_') or name.startswith('predictor_')},
                        'native_projection':'Stored exact nearest indices apply equally to I and intrinsic UV.'}
        write(geometry_path,geometry)
    preprocessing_table()
    for atlas in inventory['atlases']:
        group = [e for e in entries if e['pose']==atlas['pose'] and e['direction']==atlas['direction']]
        if not all(records.get(e['key'],{}).get('status')=='SUCCESS' for e in group): continue
        out = ROOT/'atlases'/atlas['pose']/atlas['direction']
        out.mkdir(parents=True,exist_ok=True)
        canvases = {name:Image.new('RGBA',tuple(atlas['atlas_size']),(0,0,0,0)) for name in ['source','segmentation','overlay','segmentation-alpha']}
        for entry in group:
            folder = result_path(entry)
            for kind,name in [('source','source.png'),('segmentation','class-map-preview.png'),('overlay','overlay.png'),('segmentation-alpha','class-map-alpha-preview.png')]:
                canvases[kind].paste(Image.open(folder/name).convert('RGBA'),tuple(entry['atlas_box'][:2]))
        for name,image in canvases.items(): image.save(out/(name+'.png'))
        write(out/'metadata.json',dict(atlas,frame_order=[e['key'] for e in group],mirror_applied_per_frame=True if atlas['mirrored'] else False))
    for pose in inventory['labels']['poses']:
        group = [e for e in entries if e['pose']==pose]
        grid(group,records,'direction',pose+' | all frames / skin variants',ROOT/'comparisons/by-pose'/(pose+'.png'))
        for family in ['Arm','Leg']:
            grid(group,records,'direction',pose+' | '+family+' groups only',ROOT/'comparisons/by-part'/family/(pose+'.png'),family)
    for direction in inventory['labels']['directions']:
        grid([e for e in entries if e['direction']==direction],records,'pose',direction+' | all poses / skin variants',ROOT/'comparisons/by-direction'/(direction+'.png'))
    warnings = diagnostic_warnings(entries,records)
    surfaces = {e['key']:{'components_4_connected':surface_components(np.load(result_path(e)/'class-map.npy')),
                          'class_map_sha256':sha(result_path(e)/'class-map.npy')} for e in entries if records.get(e['key'],{}).get('status')=='SUCCESS'}
    write(ROOT/'surface-components.json',{'native_surface_ids_preserved':True,'frames':surfaces})
    write(ROOT/'diagnostic-warnings.json',{'not_automatic_errors':True,'temporal_analysis_applicable':False,
          'reason':'Compositor body atlas frame selects skin_color; no actual temporal sequence in these body atlases.',
          'thresholds':read(ROOT/'config.json')['diagnostics'],'warnings':warnings})
    success = [r for r in records.values() if r['status']=='SUCCESS']
    summary = {'inventory':inventory['counts'],'successful_inferences':sum(r['execution']=='inference' for r in success),
               'successful_mirrored_results':sum(r['execution']=='spatial_mirror' for r in success),
               'successful_final_frames':len(success),'failed_frames':len(records)-len(success),'pending_frames':len(entries)-len(records),
               'warning_count':len(warnings),'frames':[], 'by_pose':{},'by_direction':{}}
    for entry in entries:
        record = records.get(entry['key'])
        summary['frames'].append({'key':entry['key'],'status':record['status'] if record else 'PENDING',
            'execution':record.get('execution') if record else None,'detections':record.get('detections') if record else None,
            'diagnostics':record.get('diagnostics') if record else None,'metadata':str((result_path(entry)/'metadata.json').relative_to(ROOT))})
    for axis in ['pose','direction']:
        for name in inventory['labels']['poses' if axis=='pose' else 'directions']:
            group = [records[e['key']] for e in entries if e[axis]==name and e['key'] in records and records[e['key']]['status']=='SUCCESS']
            summary['by_'+axis][name] = {'frames':len(group),'frames_with_detection':sum(r['detections']['count']>0 for r in group),
                'mean_coverage':statistics.mean(r['diagnostics']['coverage'] or 0 for r in group) if group else None,
                'mean_detection_score':statistics.mean(r['detections']['selected_score'] for r in group if r['detections']['selected_score'] is not None) if any(r['detections']['selected_score'] is not None for r in group) else None,
                'mean_outside_pixels':statistics.mean(r['diagnostics']['predicted_pixels_outside_alpha'] for r in group) if group else None}
    write(ROOT/'summary.json',summary)
    write(ROOT/'labels.json',{'surface_ids':list(range(25)),'groups':GROUPS,'palette_rgb':COLORS,'background':0,
          'mirror_policy':read(ROOT/'config.json')['mirror_policy']})
    palette = Image.new('RGB',(540,30+len(GROUPS)*28),(29,32,39))
    draw = ImageDraw.Draw(palette)
    draw.text((10,5),'Diagnostic groups / original DensePose IDs',font=font(14),fill='white')
    for row,(name,ids) in enumerate(GROUPS.items()):
        y = 30+row*28
        draw.rectangle((10,y,42,y+20),fill=tuple(COLORS[name]))
        draw.text((55,y+2),name+'  '+str(ids),font=font(14),fill='white')
    palette.save(ROOT/'comparisons/palette.png')
    from reporter import report
    report()
    print({k:v for k,v in summary.items() if k not in ['frames','by_pose','by_direction']},flush=True)


def verify():
    inventory = read(ROOT/'source-inventory.json')
    records = read(ROOT/'protected-before.json')
    changed = [name for name,value in records.items() if not (REPO/name).is_file() or sha(REPO/name)!=value]
    if changed: raise AssertionError('Protected files changed: '+str(changed))
    checked = 0
    for entry in inventory['frames']:
        folder = result_path(entry)
        record = read(folder/'metadata.json')
        if record['status']!='SUCCESS': continue
        if record['adapter_sha256']!=adapter_hash(): raise AssertionError('Adapter fingerprint mismatch')
        labels = np.load(folder/'class-map.npy')
        if labels.shape!=tuple(reversed(entry['frame_size'])) or not np.isin(labels,np.arange(25)).all(): raise AssertionError('Invalid native map: '+entry['key'])
        if not np.array_equal(np.asarray(Image.open(folder/'source.png')),np.asarray(frame(entry))): raise AssertionError('Source pixels changed')
        for name,value in record['artifact_sha256'].items():
            if sha(folder/name)!=value: raise AssertionError('Artifact checksum changed: '+entry['key']+'/'+name)
        uv = np.load(folder/'native/uv.npz')['uv']
        if uv.shape!=(2,*labels.shape) or not np.isfinite(uv).all(): raise AssertionError('Invalid native UV')
        diagnostics = record['diagnostics']
        alpha = np.asarray(Image.open(folder/'source.png').getchannel('A'))>0
        foreground = labels!=0
        if int((foreground & ~alpha).sum())!=diagnostics['predicted_pixels_outside_alpha'] or int((~foreground & alpha).sum())!=diagnostics['unassigned_visible_pixels']:
            raise AssertionError('Silhouette diagnostics mismatch')
        if {str(i):int((labels==i).sum()) for i in range(25)}!=diagnostics['surface_pixel_counts']:
            raise AssertionError('Surface pixel counts mismatch')
        for name,ids in GROUPS.items():
            if not np.array_equal(np.asarray(Image.open(folder/'masks'/(name+'.png'))),np.isin(labels,ids).astype(np.uint8)*255): raise AssertionError('Mask changed pixel ownership')
            if diagnostics['groups'][name]['pixels']!=int(np.isin(labels,ids).sum()): raise AssertionError('Group counts mismatch')
        if entry['mirrored']:
            source = ROOT/record['mirrored_from']
            if not np.array_equal(labels,np.load(source/'class-map.npy')[:,::-1]): raise AssertionError('Mirror not exact')
            if not np.array_equal(uv,np.load(source/'native/uv.npz')['uv'][:,:,::-1]): raise AssertionError('Mirror UV not exact')
        else:
            raw = np.load(folder/'raw/class-map.npy')
            transform = record['transform']
            yy,xx = np.array(transform['inverse_sample_y']),np.array(transform['inverse_sample_x'])
            for indices,offset,canvas,length in [(xx,transform['source_offset_xy'][0],transform['canvas_size'][0],raw.shape[-1]),
                                                  (yy,transform['source_offset_xy'][1],transform['canvas_size'][1],raw.shape[-2])]:
                target = (np.arange(len(indices))+0.5+offset)*length/canvas
                if not np.all(np.abs(indices+0.5-target)<=0.500000001): raise AssertionError('Not nearest to native pixel centers')
            if not np.array_equal(labels,raw[yy[:,None],xx[None,:]]): raise AssertionError('Projection mismatch')
            raw_uv = np.load(folder/'raw/uv-model-grid.npz')['values']
            if not np.array_equal(uv,raw_uv[:,yy[:,None],xx[None,:]]): raise AssertionError('UV/I sampling not aligned')
            for name,spec in record['raw_tensors'].items():
                with np.load(folder/'raw'/spec['file']) as archive:
                    values = archive['values']
                    if list(values.shape)!=spec['shape'] or str(values.dtype)!=spec['dtype'] or not np.isfinite(values).all(): raise AssertionError('Invalid original tensor metadata')
        checked+=1
    for atlas in inventory['atlases']:
        out = ROOT/'atlases'/atlas['pose']/atlas['direction']
        for name in ['source','segmentation','overlay','segmentation-alpha']:
            with Image.open(out/(name+'.png')) as image:
                if list(image.size)!=atlas['atlas_size']: raise AssertionError('Atlas dimensions changed')
                for entry in [e for e in inventory['frames'] if e['pose']==atlas['pose'] and e['direction']==atlas['direction']]:
                    target_name = {'source':'source.png','segmentation':'class-map-preview.png','overlay':'overlay.png','segmentation-alpha':'class-map-alpha-preview.png'}[name]
                    crop = np.asarray(image.convert('RGBA').crop(tuple(entry['atlas_box'])))
                    expected = np.asarray(Image.open(result_path(entry)/target_name).convert('RGBA'))
                    if not np.array_equal(crop,expected): raise AssertionError('Atlas frame order/pixels changed')
    summary = read(ROOT/'summary.json')
    if summary['pending_frames'] or summary['failed_frames']: raise AssertionError('Not all requested frames succeeded; inspect summary')
    write(ROOT/'verification.json',{'protected_files_unchanged':len(records),'successful_frames_checked':checked,
          'independent_inferences':summary['successful_inferences'],'exact_spatial_mirrors':summary['successful_mirrored_results'],
          'surface_ids_valid':True,'masks_preserve_membership':True,'raw_values_finite':True,'atlas_layouts_verified':len(inventory['atlases'])})
    print('Verified',checked,'frames and',len(inventory['atlases']),'atlases; protected files unchanged.',flush=True)


def resume_test():
    summary = read(ROOT/'summary.json')
    if summary['pending_frames'] or summary['failed_frames']: raise ValueError('Resume proof requires a completed successful run')

    def snapshot():
        return {str(path.relative_to(ROOT)):{'bytes':path.stat().st_size,'mtime_ns':path.stat().st_mtime_ns}
                for path in (ROOT/'results').rglob('*') if path.is_file()}

    before = snapshot()
    windows = PureWindowsPath(str(ROOT/'worker.sh'))
    script = '/mnt/'+windows.drive[0].lower()+'/'+('/'.join(windows.parts[1:]))
    with (ROOT/'resume-test.log').open('w',encoding='utf-8') as log:
        result = subprocess.run(['wsl','-d','Ubuntu','--','bash',script,'run'],stdout=log,stderr=subprocess.STDOUT)
    if result.returncode: raise RuntimeError('Resume check failed; see resume-test.log')
    after = snapshot()
    if before!=after: raise AssertionError('Resume altered existing frame outputs')
    result = read(ROOT/'resume-check.json')
    if result['pending'] or result['new_inferences'] or result['skipped']!=summary['successful_final_frames']:
        raise AssertionError('Resume did not skip every completed frame')
    write(ROOT/'resume-verification.json',dict(result,frame_files_unchanged=len(before),file_sizes_and_mtimes_identical=True))
    print('Resume skipped all frames without model inference or output writes.',flush=True)
