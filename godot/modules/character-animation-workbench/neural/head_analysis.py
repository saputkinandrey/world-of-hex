"""Postprocess stored neural heads without anatomical guides or GPU execution."""
import argparse
import csv
import json
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw

from evidence_store import CLASSES, write_json
from head_localization import MissingNeuralHead, head_support
from preprocess import project, sha
from raw_analysis import semanticsam
from head_runs import evaluation_seeds

THRESHOLDS = (15,32,64,96,128,160,192,224)


def components(alpha, threshold):
    count,labels,stats,_ = cv2.connectedComponentsWithStats((alpha > threshold).astype(np.uint8),8)
    records = []
    for index in range(1,count):
        x,y,width,height,area = map(int,stats[index])
        records.append({'component':index,'bbox':[x,y,width,height],'area':area,
                        'alpha_mass':int(alpha[labels==index].sum()),'eligible':area>=16})
    eligible = [row for row in records if row['eligible']]
    selected = max(eligible,key=lambda row:row['alpha_mass']) if eligible else None
    return labels == selected['component'] if selected else np.zeros(alpha.shape,bool),records,selected


def metrics(mask, silhouette):
    y,x = np.where(mask)
    count,_,_,_ = cv2.connectedComponentsWithStats(mask.astype(np.uint8),8)
    return {'area_source_px':int(mask.sum()),'bbox_xywh':
            [int(x.min()),int(y.min()),int(x.max()-x.min()+1),int(y.max()-y.min()+1)] if len(x) else None,
            'centroid_xy':[float(x.mean()),float(y.mean())] if len(x) else None,
            'components':count-1,'outside_silhouette_px':int((mask & ~silhouette).sum()),
            'silhouette_overlap_fraction':float((mask & silhouette).sum()/max(mask.sum(),1))}


def iou(left,right):
    union = (left | right).sum()
    return float((left & right).sum()/union) if union else None


def overlay(source, mask):
    background = Image.new('RGBA',source.size,(38,42,47,255))
    background.alpha_composite(source.convert('RGBA'))
    result = np.array(background.convert('RGB')).copy()
    result[mask] = (result[mask]*.5+np.array([40,235,130])*.5).astype(np.uint8)
    return Image.fromarray(result)


def panel_atlas(cells, columns, path, cell_size=(300,330)):
    width,height = cell_size
    atlas = Image.new('RGB',(columns*width,((len(cells)+columns-1)//columns)*height),(29,34,41))
    draw = ImageDraw.Draw(atlas)
    for index,(label,image) in enumerate(cells):
        x,y = (index%columns)*width,(index//columns)*height
        draw.text((x+5,y+5),label,fill='white')
        picture = image.convert('RGBA')
        scale = min((width-12)/picture.width,(height-32)/picture.height)
        picture = picture.resize((round(picture.width*scale),round(picture.height*scale)),Image.Resampling.NEAREST)
        background = Image.new('RGBA',picture.size,(38,42,47,255))
        background.alpha_composite(picture)
        atlas.paste(background.convert('RGB'),(x+(width-picture.width)//2,y+26))
    atlas.save(path)


def analyze_evaluation(folder, record, source, threshold=128, destination=None):
    folder = Path(folder)
    destination = Path(destination) if destination is not None else folder/'analysis'
    destination.mkdir(parents=True,exist_ok=True)
    raw = folder/'layerdiff/raw/layers/head.png'
    alpha = np.asarray(Image.open(raw).convert('RGBA'))[...,3] if raw.exists() else np.zeros(tuple(reversed(record['transform']['input_size'])),np.uint8)
    silhouette = np.asarray(source.getchannel('A'))>0
    comparisons = {}
    cells = []
    for value in THRESHOLDS:
        model,regions,selected = components(alpha,value)
        native = project(model.astype(np.uint8),record['transform'])>0
        Image.fromarray(model.astype(np.uint8)*255).save(destination/f'head-model-alpha{value}.png')
        Image.fromarray(native.astype(np.uint8)*255).save(destination/f'head-native-alpha{value}.png')
        comparisons[str(value)] = {'selected_component':selected,'all_components':regions,**metrics(native,silhouette)}
        cells.append((f'alpha>{value} area={native.sum()}',overlay(source,native)))
    try:
        control = head_support(alpha,destination/'control-components.json')>0
    except MissingNeuralHead as error:
        control = np.zeros(alpha.shape,bool)
        write_json(destination/'control-components.json',{'outcome':'no_meaningful_detection','reason':str(error)})
    Image.fromarray(control.astype(np.uint8)*255).save(destination/'control-model.png')
    Image.fromarray(project(control.astype(np.uint8),record['transform'])*255).save(destination/'control-native.png')
    model,_,selected = components(alpha,threshold)
    native = project(model.astype(np.uint8),record['transform'])>0
    Image.fromarray(model.astype(np.uint8)*255).save(destination/'head-model.png')
    Image.fromarray(native.astype(np.uint8)*255).save(destination/'head-native.png')
    overlay(source,native).save(destination/'overlay.png')
    panel_atlas(cells,4,destination/'threshold-comparison.png')
    bounds = Image.fromarray(native.astype(np.uint8)*255).getbbox()
    if bounds:
        box = (max(0,bounds[0]-6),max(0,bounds[1]-6),min(source.width,bounds[2]+6),min(source.height,bounds[3]+6))
        details = [('source detail',source.crop(box))]
        for value in THRESHOLDS:
            support = np.asarray(Image.open(destination/f'head-native-alpha{value}.png'))>0
            details.append((f'alpha>{value}',overlay(source,support).crop(box)))
        panel_atlas(details,4,destination/'threshold-anatomy-detail.png',cell_size=(400,430))
    stats = {'threshold':threshold,'selected_component':selected,'threshold_comparisons':comparisons,
        'prediction_available':raw.exists(),
        'control':'existing strongest alpha128 component with explicit64/192 fallback',
        'metrics':metrics(native,silhouette),'raw_head_sha256':sha(raw) if raw.exists() else None,
        'mean_selected_alpha':float(alpha[model].mean()) if model.any() else None,
        'confidence_meaning':'neural alpha support, not calibrated anatomical correctness',
        'mask_coordinates':'native first-frame pixels; untrimmed by source silhouette'}
    sam_path = folder/'semantic-sam/raw/logits.npz'
    sam = {}
    if sam_path.exists():
        logit_destination = destination/'sam-logits'
        logit_destination.mkdir(exist_ok=True)
        write_json(logit_destination/'distributions.json',semanticsam(folder/'semantic-sam',logit_destination))
        with np.load(sam_path,allow_pickle=False) as data:
            logits = data['logits']
        sam_cells = []
        for index,name in enumerate(CLASSES):
            values = project(logits[index],record['transform'])
            positive = values>0
            sam[name] = {'positive_source_px':int((positive & silhouette).sum()),
                'positive_in_head_px':int((positive & native).sum()),
                'head_support_fraction':float((positive & native).sum()/max(native.sum(),1)),
                'positive_outside_character_px':int((positive & ~silhouette).sum()),
                'head_logit_max':float(values[native].max()) if native.any() else None,
                'head_logit_mean':float(values[native].mean()) if native.any() else None,
                'logit_range':[float(logits[index].min()),float(logits[index].max())]}
            sam_cells.append((name,overlay(source,positive)))
        panel_atlas(sam_cells,5,destination/'sam-independent-19.png')
    stats['semantic_sam_independent'] = sam
    write_json(destination/'head.json',stats)
    return native,stats


def analyze_batch(batch, threshold=128):
    batch = Path(batch)
    config = json.loads((batch/'experiment.json').read_text())
    seeds = evaluation_seeds(batch)
    run_count = len(seeds)
    source = Image.open(batch/'reference/source.png').convert('RGBA')
    reference_raw = Image.open(batch/'reference/baseline-head-raw.png').convert('RGBA')
    baseline_model = head_support(np.asarray(reference_raw)[...,3])
    baseline = project(baseline_model,config['input']['transform'])>0
    masks,results,cells = [],[],[('original SW',source),('baseline neural head',reference_raw),('baseline overlay',overlay(source,baseline))]
    for number,seed in enumerate(seeds,1):
        folder = batch/f'run-{number:02d}'
        native,stats = analyze_evaluation(folder,config['input'],source,threshold)
        sam_path = folder/'semantic-sam/raw/logits.npz'
        if sam_path.exists():
            with np.load(sam_path,allow_pickle=False) as archive:
                sam_logits = archive['logits']
            stats['sam_fixed_neural_reference_region'] = {}
            for index,name in enumerate(CLASSES):
                values = project(sam_logits[index],config['input']['transform'])
                stats['sam_fixed_neural_reference_region'][name] = {
                    'positive_px':int(((values>0)&baseline).sum()),
                    'reference_area_px':int(baseline.sum()),
                    'mean_logit':float(values[baseline].mean()) if baseline.any() else None,
                    'maximum_logit':float(values[baseline].max()) if baseline.any() else None}
        masks.append(native)
        results.append({'run':number,'seed':seed,**stats,'iou_baseline':iou(native,baseline) if stats['prediction_available'] else None})
        raw = folder/'layerdiff/raw/layers/head.png'
        raw_image = Image.open(raw).convert('RGBA') if raw.exists() else Image.new('RGBA',(512,512))
        label = f'{number:02d} seed={seed}' if raw.exists() else f'{number:02d} NO PREDICTION: execution failure'
        cells.extend([(label+' RAW',raw_image),
                      (label+' NATIVE',Image.fromarray(native.astype(np.uint8)*255)),
                      (label+' OVERLAY',overlay(source,native))])
    destination = batch/'analysis'
    destination.mkdir(exist_ok=True)
    panel_atlas(cells,3,destination/'head-comparison-atlas.png',cell_size=(450,480))
    panel_atlas([(f"{row['run']:02d} seed={row['seed']}" if row['prediction_available'] else f"{row['run']:02d} NO OUTPUT: execution failure",overlay(source,mask)) for row,mask in zip(results,masks)],
                5,destination/'native-overlays.png',cell_size=(450,480))
    bounds = Image.fromarray(baseline.astype(np.uint8)*255).getbbox()
    if bounds:
        detail_box = (max(bounds[0]-12,0),max(bounds[1]-12,0),min(bounds[2]+12,source.width),min(bounds[3]+12,source.height))
        panel_atlas([(f"{row['run']:02d} seed={row['seed']} head detail",overlay(source,mask).crop(detail_box))
                    for row,mask in zip(results,masks)],5,destination/'anatomy-detail-atlas.png',cell_size=(450,480))
    pairwise = [[iou(a,b) if results[row]['prediction_available'] and results[column]['prediction_available'] else None
                 for column,b in enumerate(masks)] for row,a in enumerate(masks)]
    with (destination/'pairwise-iou.csv').open('w',newline='',encoding='utf-8') as stream:
        writer = csv.writer(stream)
        writer.writerow(['run']+[f'{number:02d}' for number in range(1,run_count+1)])
        for number,row in enumerate(pairwise,1):
            writer.writerow([f'{number:02d}']+['NA' if value is None else f'{value:.6f}' for value in row])
    disagreements = []
    for row,a in enumerate(masks):
        for column,b in enumerate(masks):
            diff = np.zeros((*a.shape,3),np.uint8)
            available = results[row]['prediction_available'] and results[column]['prediction_available']
            if available:
                diff[a & b] = [70,90,100]
                diff[a & ~b] = [250,70,60]
                diff[b & ~a] = [50,180,255]
            label = f'{row+1:02d} vs {column+1:02d}'+('' if available else ' NA: no output')
            disagreements.append((label,Image.fromarray(diff)))
    panel_atlas(disagreements,run_count,destination/'pairwise-disagreement.png',cell_size=(220,245))
    frequencies = np.stack(masks).mean(axis=0)
    np.savez_compressed(destination/'head-frequencies.npz',frequency=frequencies)
    heat = np.zeros((*frequencies.shape,3),np.uint8)
    heat[...,0] = (frequencies*255).astype(np.uint8)
    heat[...,2] = ((1-frequencies)*255).astype(np.uint8)
    Image.fromarray(heat).resize((900,900),Image.Resampling.NEAREST).save(destination/'head-frequency.png')
    comparable = results[0]['prediction_available'] and results[1]['prediction_available']
    repeat = {'comparable':comparable,'mask_xor_source_px':int((masks[0]^masks[1]).sum()) if comparable else None,
              'iou':iou(masks[0],masks[1]) if comparable else None,
              'interpretation':'actual identical-seed comparison' if comparable else 'Execution failure prevents a two-prediction reproducibility comparison'}
    for model,filename in [('layerdiff','raw/layers/head.png'),('semantic-sam','raw/logits.npz')]:
        first,second = batch/'run-01'/model/filename,batch/'run-02'/model/filename
        repeat[model+'_raw_bytes_identical'] = first.exists() and second.exists() and sha(first)==sha(second)
        if model=='semantic-sam' and first.exists() and second.exists():
            with np.load(first) as a,np.load(second) as b:
                repeat['sam_max_abs_logit_difference'] = float(np.abs(a['logits']-b['logits']).max())
        if model=='layerdiff' and first.exists() and second.exists():
            a,b = np.asarray(Image.open(first)).astype(np.int16),np.asarray(Image.open(second)).astype(np.int16)
            repeat['layerdiff_differing_rgba_values'] = int((a!=b).sum())
            repeat['layerdiff_max_abs_rgba_difference'] = int(np.abs(a-b).max())
    thresholds = {}
    for value in THRESHOLDS:
        native_masks = [np.asarray(Image.open(batch/f'run-{number:02d}/analysis'/f'head-native-alpha{value}.png'))>0 for number in range(1,run_count+1)]
        valid = [mask for mask,row in zip(native_masks,results) if row['prediction_available']]
        scores = [iou(a,b) for index,a in enumerate(valid) for b in valid[index+1:]]
        scores = [score for score in scores if score is not None]
        thresholds[str(value)] = {'comparable_predictions':len(valid),
            'mean_pairwise_iou':float(np.mean(scores)) if scores else None,
            'minimum_pairwise_iou':min(scores) if scores else None,
            'areas_source_px':[row['threshold_comparisons'][str(value)]['area_source_px'] for row in results],
            'outside_silhouette_px':[row['threshold_comparisons'][str(value)]['outside_silhouette_px'] for row in results]}
    alternative = [masks[index] for index in range(2,len(masks)) if results[index]['prediction_available']]
    alternative_scores = [iou(a,b) for index,a in enumerate(alternative) for b in alternative[index+1:]]
    alternative_scores = [score for score in alternative_scores if score is not None]
    sam_reference_path = batch/'run-01/semantic-sam/raw/logits.npz'
    sam_consistency = []
    if sam_reference_path.exists():
        with np.load(sam_reference_path,allow_pickle=False) as archive:
            sam_reference = archive['logits']
        for number,seed in enumerate(seeds,1):
            path = batch/f'run-{number:02d}/semantic-sam/raw/logits.npz'
            if path.exists():
                with np.load(path,allow_pickle=False) as archive:
                    difference = np.abs(archive['logits']-sam_reference)
                sam_consistency.append({'run':number,'seed':seed,'maximum_abs_logit_difference':float(difference.max()),
                    'different_float_values':int((difference!=0).sum())})
    report = {'threshold':threshold,'runs':results,'pairwise_iou':pairwise,'identical_seed_comparison':repeat,
              'executed_evaluations':run_count,'original_planned_evaluations':len(config['seeds']),
              'unattempted_evaluations':list(range(run_count+1,len(config['seeds'])+1)),
              'threshold_summary':thresholds,'alternative_seed_comparison':{
                  'comparable_predictions':len(alternative),'mean_pairwise_iou':float(np.mean(alternative_scores)) if alternative_scores else None,
                  'minimum_pairwise_iou':min(alternative_scores) if alternative_scores else None},
              'sam_seed_consistency':sam_consistency,
              'anatomy_warning':'Consistency and alpha confidence are not anatomical validation; see quality.json.',
              'bytes':sum(p.stat().st_size for p in batch.rglob('*') if p.is_file())}
    write_json(destination/'consistency.json',report)
    print(json.dumps({'runs':len(results),'identical_seed':repeat,'bytes':report['bytes']},indent=2))
    return report


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('batch',type=Path)
    parser.add_argument('--threshold',type=int,choices=THRESHOLDS,default=128)
    args = parser.parse_args()
    analyze_batch(args.batch,args.threshold)
