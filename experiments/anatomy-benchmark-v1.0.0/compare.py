"""Post-inference visual/quantitative diagnostics; authored masks never reach models."""
import json
import statistics

import numpy as np
from PIL import Image, ImageDraw, ImageFont

from common import ROOT, REPO, read, write

MODELS = ['schp','bodypix','sapiens2','seethrough-sam','densepose']
PARTS = ['upper_arm','lower_arm','upper_leg','lower_leg']
BONES = {'upper_arm':{'left':['ArmL'],'right':['ArmR']}, 'lower_arm':{'left':['ForearmL'],'right':['ForearmR']},
         'upper_leg':{'left':['ThighL'],'right':['ThighR']},'lower_leg':{'left':['CalfL'],'right':['CalfR']}}
TILE = 170
ROW = 195


def font(size):
    try:
        return ImageFont.truetype('C:/Windows/Fonts/arial.ttf',size)
    except OSError:
        return ImageFont.load_default(size=size)


def background(image):
    canvas = Image.new('RGBA',image.size,(52,55,63,255))
    canvas.alpha_composite(image.convert('RGBA'))
    return canvas.convert('RGB')


def group_mask(labels, ids):
    return np.isin(labels,ids) if labels.ndim==2 else np.any(np.isin(labels,ids),axis=0)


def authored(view):
    source = read(REPO/'godot/modules/character-animation-workbench/masks/authored-segmentation.json')['views'][view]
    offset = read(ROOT/'input/frames.json')[view]['source_to_canvas_offset_xy']
    image = Image.new('I',(150,150),0)
    draw = ImageDraw.Draw(image)
    names = {}
    for index,part in enumerate(source,1):
        names[part['bone']] = index
        points = [(x+offset[0],y+offset[1]) for x,y in part['polygon']]
        draw.polygon(points,fill=index)
    return np.array(image),names


def dilate(mask):
    padded = np.pad(mask,1)
    return np.logical_or.reduce([padded[y:y+150,x:x+150] for y in range(3) for x in range(3)])


def joint_boundary(first,second):
    return (first & dilate(second)) | (second & dilate(first))


def boundary_score(predicted,reference):
    if not reference.any(): return None
    if not predicted.any(): return 0.0
    precision = (predicted & dilate(reference)).sum()/predicted.sum()
    recall = (reference & dilate(predicted)).sum()/reference.sum()
    return float(2*precision*recall/(precision+recall)) if precision+recall else 0.0


def diagnostics(view,model,method):
    folder = ROOT/model/(view+'-'+method)
    labels = np.load(folder/'class-map-native.npy',allow_pickle=False)
    spec = read(folder/'labels.json')
    reference,names = authored(view)
    alpha = np.array(Image.open(ROOT/'input'/(view+'.png')).getchannel('A'))>0
    groups = spec['groups']
    result = {'authored_reference_is_not_ground_truth':True,'parts':{},'joint_boundary_f1_tolerance_1px':{},
              'side_reference_iou_matrix':{},
              'side_caveat':'Native model left/right and authored bone suffixes are retained. Cross-side matrix diagnoses naming conventions; no automatic swap or merge.'}
    model_masks,reference_masks = {},{}
    for part, sides in groups.items():
        if part not in BONES: continue
        for side, ids in sides.items():
            if not ids: continue
            key = part+'-'+side
            prediction = group_mask(labels,ids)
            target_bones = BONES[part][side] if side!='both' else BONES[part]['left']+BONES[part]['right']
            target = np.isin(reference,[names[bone] for bone in target_bones]) & alpha
            union = (prediction | target).sum()
            clipped = prediction & alpha
            union_clipped = (clipped | target).sum()
            result['parts'][key] = {'native_ids':ids,'reference_bones':target_bones,
                 'iou_unclipped':float((prediction & target).sum()/union) if union else None,
                 'iou_alpha_diagnostic':float((clipped & target).sum()/union_clipped) if union_clipped else None,
                 'predicted_pixels':int(prediction.sum()),'predicted_alpha_pixels':int(clipped.sum()),
                 'authored_pixels':int(target.sum())}
            matrix_row = {}
            reference_sides = ['both'] if side=='both' else ['left','right']
            for reference_side in reference_sides:
                bones = BONES[part][reference_side] if reference_side!='both' else BONES[part]['left']+BONES[part]['right']
                reference_mask = np.isin(reference,[names[bone] for bone in bones]) & alpha
                combined = (clipped | reference_mask).sum()
                matrix_row[reference_side] = float((clipped & reference_mask).sum()/combined) if combined else None
            result['side_reference_iou_matrix'].setdefault(part,{})[side] = matrix_row
            model_masks[key],reference_masks[key] = clipped,target
            (folder/'diagnostic-groups').mkdir(exist_ok=True)
            Image.fromarray(prediction.astype(np.uint8)*255).save(folder/'diagnostic-groups'/(key+'.png'))
    for upper,lower in [('upper_arm','lower_arm'),('upper_leg','lower_leg')]:
        for side in ['left','right','both']:
            first,second = upper+'-'+side,lower+'-'+side
            if first in model_masks and second in model_masks:
                result['joint_boundary_f1_tolerance_1px'][upper+'-'+side] = boundary_score(
                    joint_boundary(model_masks[first],model_masks[second]),joint_boundary(reference_masks[first],reference_masks[second]))
    return result


def sheet(view,method,statuses):
    headers = ['Source','Native categories','Overlay','Upper arms','Lower arms','Upper legs','Lower legs']
    positions = [180,350,520,690,1010,1330,1650]
    canvas = Image.new('RGB',(1970,70+len(MODELS)*ROW),(26,29,36))
    draw = ImageDraw.Draw(canvas)
    draw.text((12,8),view+' / '+method+' | Same 150px canvas; no correction',font=font(16),fill='white')
    for column,title in enumerate(headers):
        draw.text((positions[column],42),title,font=font(14),fill='white')
    for row,model in enumerate(MODELS):
        top = 70+row*ROW
        draw.rectangle((0,top,canvas.width,top+ROW-2),fill=(40,43,51) if row%2==0 else (33,36,44))
        draw.text((8,top+10),model,font=font(17),fill='white')
        status = statuses.get(model,{'status':'NOT_RUN'})
        draw.text((8,top+38),status['status'],font=font(12),fill=(140,230,160) if status['status']=='SUCCESS' else (255,180,100))
        source = background(Image.open(ROOT/'input'/(view+'.png')))
        canvas.paste(source,(180,top+30))
        folder = ROOT/model/(view+'-'+method)
        if not (folder/'labels.json').exists():
            for column in range(1,7):
                draw.text((positions[column]+32,top+82),'N/A',font=font(24),fill=(200,200,200))
            continue
        for column,name in [(1,'class-map-preview.png'),(2,'overlay-original.png')]:
            canvas.paste(background(Image.open(folder/name)),(positions[column],top+30))
        groups = read(folder/'labels.json')['groups']
        labels = np.load(folder/'class-map-native.npy',allow_pickle=False)
        for column,part in enumerate(PARTS,3):
            sides = groups.get(part,{})
            if not sides or not any(sides.values()):
                draw.text((positions[column]+32,top+82),'N/A',font=font(24),fill=(200,200,200))
                continue
            for side_index,(side,ids) in enumerate(sides.items()):
                if not ids: continue
                mask = group_mask(labels,ids)
                thumbnail = Image.fromarray(mask.astype(np.uint8)*255).convert('RGB')
                x = positions[column]
                if side!='both':
                    x += side_index*160
                else:
                    draw.text((x+165,top+82),'N/A L/R',font=font(18),fill=(200,200,200))
                canvas.paste(thumbnail,(x,top+30))
                draw.text((x,top+5),side+': '+str(int(mask.sum()))+'px',font=font(11),fill='white')
    return canvas


def compare():
    from outputs import primary_aliases
    out = ROOT/'comparisons'
    out.mkdir(exist_ok=True)
    statuses = {model:read(ROOT/model/'metadata.json') for model in MODELS if (ROOT/model/'metadata.json').exists()}
    for model,status in statuses.items():
        if status['status']=='SUCCESS': primary_aliases(ROOT/model)
    quantitative = {}
    alpha_records = []
    for view in read(ROOT/'config.json')['sources']:
        for method in ['nearest','bicubic']:
            sheet(view,method,statuses).save(out/(view+'-'+method+'.png'))
            for model,status in statuses.items():
                if status['status']=='SUCCESS':
                    quantitative[model+'/'+view+'/'+method] = diagnostics(view,model,method)
                    case = read(ROOT/model/(view+'-'+method)/'metadata.json')
                    alpha_records.append({'model':model,'view':view,'resampling':method,**{name:case[name] for name in
                        ['source_alpha_pixels','visible_alpha_pixels_predicted','predicted_pixels_outside_source_alpha','overlapping_class_pixels']}})
    write(out/'authored-diagnostics.json',quantitative)
    write(out/'alpha-summary.json',alpha_records)
    first = Image.open(out/'south-west-nearest.png')
    second = Image.open(out/'south-west-bicubic.png')
    combined = Image.new('RGB',(first.width*2,first.height))
    combined.paste(first,(0,0))
    combined.paste(second,(first.width,0))
    combined.save(out/'comparison-all-five.png')
    if statuses.get('densepose',{}).get('status')=='SUCCESS':
        gallery = Image.new('RGB',(1020,800),(40,43,51))
        draw = ImageDraw.Draw(gallery)
        for row,view in enumerate(read(ROOT/'config.json')['sources']):
            for column,method in enumerate(['nearest','bicubic']):
                draw.text((column*510,row*200+10),view+' '+method,fill='white',font=font(14))
                for index,name in enumerate(['input.png','class-map-preview.png','overlay-original.png']):
                    tile = background(Image.open(ROOT/'densepose'/(view+'-'+method)/name))
                    gallery.paste(tile.resize((150,150),Image.Resampling.NEAREST),(column*510+index*160,row*200+35))
        gallery.save(out/'densepose-all-views.png')
    rows = []
    for model,status in statuses.items():
        metrics = [r['metrics'] for r in status.get('runs',[])]
        cuda = [m['cuda_peak_allocated_bytes'] for m in metrics if m.get('cuda_peak_allocated_bytes') is not None]
        ram = [max(m.get('ram_sampled_peak_bytes') or 0,m.get('ram_lifetime_peak_bytes') or 0) for m in metrics]
        rows.append({'model':model,'status':status['status'],'classes':status.get('number_of_classes'),
                     'mean_inference_seconds':statistics.mean(m['seconds'] for m in metrics) if metrics else None,
                     'peak_cuda_allocated_bytes':max(cuda) if cuda else None,'peak_ram_bytes':max(ram) if ram else None,
                     'successful_requests':len(metrics),'error':status.get('error')})
    write(out/'technical-summary.json',rows)
    print('Comparison tables and independent authored-mask diagnostics saved.')
