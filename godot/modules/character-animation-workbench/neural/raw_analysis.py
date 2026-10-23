"""Read-only evidence diagnostics, independent for each model and direction."""
import traceback
import cv2
import numpy as np
from PIL import Image, ImageDraw
from evidence_store import CLASSES, MODELS, locked, verify, write_json
from preprocess import OUTPUT, SOURCES, frame, project, sha


def sheet(panels, path, columns=4):
    side = 192
    result = Image.new('RGB',(side*columns,216*((len(panels)+columns-1)//columns)),(28,32,39))
    draw = ImageDraw.Draw(result)
    for index,(name,image) in enumerate(panels):
        x,y = (index%columns)*side,(index//columns)*216
        draw.text((x+5,y+4),name,fill='white')
        image = image.convert('RGBA').resize((side,side),Image.Resampling.NEAREST)
        result.paste(image,(x,y+24),image)
    result.save(path)


def distribution(values):
    edges = [-np.inf,-10,-5,-2,-1,0,1,2,5,10,np.inf]
    return {'min':float(values.min()),'max':float(values.max()),
            'quantiles':np.quantile(values,[0,.01,.1,.5,.9,.99,1]).tolist(),
            'histogram_edges':['-inf',-10,-5,-2,-1,0,1,2,5,10,'inf'],
            'histogram_counts':np.histogram(values,bins=edges)[0].tolist()}


def layerdiff(path, target):
    report,panels = {},[]
    for image_path in sorted((path/'raw/layers').glob('*.png')):
        image = Image.open(image_path)
        values = np.array(image)
        if image_path.stem.endswith('_depth'):
            report[image_path.stem] = {'kind':'depth','min':int(values.min()),'max':int(values.max())}
        elif image.mode == 'RGBA':
            alpha = values[...,3]
            _,_,stats,_ = cv2.connectedComponentsWithStats((alpha>0).astype(np.uint8),8)
            report[image_path.stem] = {'alpha_histogram_0_255':np.bincount(alpha.ravel(),minlength=256).tolist(),
                'nonzero_components_px':sorted(stats[1:,cv2.CC_STAT_AREA].tolist(),reverse=True),
                'nonzero':int((alpha>0).sum()),'alpha_over_128':int((alpha>128).sum()),
                'low_confidence_rejected_by_128':int(((alpha>0)&(alpha<=128)).sum())}
        panels.append((image_path.stem,image.copy()))
    sheet(panels,target/'all-layers-depth-reconstruction.png')
    return {'layers':report,'empty_or_hallucinated_layers':'retained without semantic filtering',
            'historical_head_limit':'older runs retain projected head predictions; never invent unavailable original preprojection arrays'}


def semanticsam(path, target):
    logits = np.load(path/'raw/logits.npz',allow_pickle=False)['logits']
    panels,classes = [],{}
    positive = logits>0
    overlap = positive.sum(axis=0)
    Image.fromarray(overlap.astype(np.uint8)).save(target/'class-overlap-count.png')
    for index,name in enumerate(CLASSES):
        values = logits[index]
        classes[name] = {**distribution(values),'positive_px':int((values>0).sum()),
                         'zero_px':int((values==0).sum()),'negative_px':int((values<0).sum()),
                         'positive_overlap_px':int(((values>0)&(overlap>1)).sum())}
        intensity = np.tanh(np.abs(values)/4)
        rgb = np.zeros((*values.shape,3),dtype=np.uint8)
        rgb[...,0] = np.where(values>0,255*intensity,0).astype(np.uint8)
        rgb[...,2] = np.where(values<0,255*intensity,0).astype(np.uint8)
        image = Image.fromarray(rgb)
        image.save(target/(name+'-signed-logits.png'))
        panels.append((name+' red>0 blue<0',image))
    sheet(panels,target/'all-19-signed-logits.png')
    return {'classes':classes,'overlap_count_histogram':np.bincount(overlap.ravel(),minlength=20).tolist(),
            'raw_logit_dtype':str(logits.dtype),'mutually_exclusive_selection':False,
            'visualization':'red positive / blue negative; tanh display only; complete float logits unchanged'}


def semantic_comparison(view):
    left,lmeta = verify(view,'layerdiff')
    right,rmeta = verify(view,'semantic-sam')
    logits = np.load(right/'raw/logits.npz')['logits']
    visible = np.asarray(frame(view)[0])[...,3]>0
    result = {}
    for name in ('topwear','handwear','legwear','footwear'):
        alpha = np.asarray(Image.open(left/'raw/layers'/(name+'.png')))[...,3]
        a = (project(alpha,lmeta['input']['transform'])>128)&visible
        b = (project(logits[CLASSES.index(name)],rmeta['input']['transform'])>0)&visible
        result[name] = {'layerdiff_positive_source_px':int(a.sum()),'sam_positive_source_px':int(b.sum()),
                        'intersection_px':int((a&b).sum()),'union_px':int((a|b).sum()),
                        'meaning':'semantic disagreement, not anatomy accuracy; no skeletal mapping implied'}
    return result


def main():
    results = {}
    with locked():
        for view in SOURCES:
            results[view] = {}
            for model in MODELS:
                try:
                    path,metadata = verify(view,model)
                    target = OUTPUT/'analysis/raw'/view/model
                    target.mkdir(parents=True,exist_ok=True)
                    report = layerdiff(path,target) if model=='layerdiff' else semanticsam(path,target)
                    report['evidence_manifest_sha256'] = sha(path/'manifest.json')
                    write_json(target/'diagnostics.json',report)
                    results[view][model] = {'outcome':'success','diagnostics':str(target),'input':metadata['input']}
                except Exception:
                    results[view][model] = {'outcome':'analysis_failure','error':traceback.format_exc()}
                    traceback.print_exc()
            try:
                results[view]['semantic_comparison'] = semantic_comparison(view)
            except Exception:
                results[view]['semantic_comparison'] = {'outcome':'unavailable','error':traceback.format_exc()}
                traceback.print_exc()
        write_json(OUTPUT/'analysis/raw-status.json',results)
    return results


if __name__ == '__main__':
    main()
