"""Conservative independent bone candidates; unresolved anatomy stays unknown."""
import json
from pathlib import Path

import cv2
import numpy as np
from PIL import Image
from head_localization import MissingNeuralHead, head_support
from preprocess import OUTPUT, SOURCES, frame, project, sha

BONES = ['Pelvis','Spine','Chest','Head','ArmL','ForearmL','ArmR','ForearmR',
         'ThighL','CalfL','ThighR','CalfR','FootL','FootR']
PALETTE = [(216,80,80),(230,150,60),(235,215,70),(110,210,100),
           (50,190,180),(60,130,240),(130,80,230),(210,80,210),
           (160,110,70),(110,150,60),(70,150,170),(160,160,210),
           (245,180,60),(100,210,245)]
# Output-channel namespace, not an anatomical inference: upstream -r is the
# smaller-image-X arm; this prototype's Hex L channel binds that rest-image side.
PART_CHANNELS = {'handwear_r':'ArmL','forearm_r':'ForearmL',
                 'handwear_l':'ArmR','forearm_l':'ForearmR'}


def separate_feet(alpha):
    count,labels,stats,centers = cv2.connectedComponentsWithStats((alpha>128).astype(np.uint8),8)
    components = [index for index in range(1,count) if stats[index,cv2.CC_STAT_AREA]>=16]
    if len(components) != 2:
        return [],{'components':len(components),'decision':'unknown: not exactly two confident semantic foot components'}
    components.sort(key=lambda index:centers[index,0])
    return [(labels==index).astype(np.uint8)*255 for index in components],{
        'components':[{'bbox':stats[index,:4].tolist(),'area':int(stats[index,cv2.CC_STAT_AREA]),
                       'center':centers[index].tolist()} for index in components],
        'decision':'smaller/larger image X to Hex rest-image FootL/FootR; no ankle coordinate inference'}


def part_canvas(folder, part, size=512):
    result = Image.new('RGBA',(size,size))
    image = Image.open(folder/'parts'/(part['name']+'.png')).convert('RGBA')
    result.alpha_composite(image,(part['x'],part['y']))
    return np.asarray(result)


def build(view, key):
    records = json.loads((OUTPUT/'inputs.json').read_text())
    record = records[key]
    original,_ = frame(view)
    source = np.asarray(original)
    folder = OUTPUT/'candidates'/key
    folder.mkdir(parents=True,exist_ok=True)
    run = OUTPUT/'runs'/key/key
    votes,provenance = [],[]

    def add(bone, values, origin):
        native = project(values[...,3],record['transform'])
        # Predictions cannot create source ownership outside source alpha.
        support = (native > 128)&(source[...,3]>0)
        votes.append((BONES.index(bone)+1,support))
        provenance.append({'bone':bone,'origin':origin,'pixels_proposed':int(support.sum())})

    head = np.array(Image.open(run/'head.png').convert('RGBA'))
    try:
        head[...,3] = head_support(head[...,3])*255
    except MissingNeuralHead as error:
        provenance.append({'bone':'Head','origin':'neural prediction absent',
                           'reason':str(error),'pixels_proposed':0})
    else:
        add('Head',head,{'kind':'neural-derived segmentation refinement',
                    'source':str(run/'head.png'),'sha256':sha(run/'head.png'),
                    'rule':'strongest alpha-128 connected neural head component'})
    assembly = OUTPUT/'parts'/key/'cuts/rig'
    if (assembly/'parts.json').exists():
        parts = json.loads((assembly/'parts.json').read_text())['parts']
        for name,bone in PART_CHANNELS.items():
            part = next((item for item in parts if item['name'] == name),None)
            if part:
                add(bone,part_canvas(assembly,part),{
                    'kind':'upstream assembly operation + geometric postprocessing',
                    'source':str(assembly/'parts.json'),'part':name,
                    'rule':'upstream sleeve proposal cut; image-X tag namespace converted to Hex rest-image-side channel names; no joint coordinates used',
                    'quality':'elbow location and anatomical lateral identity are unverified; image-side channels only'})
    footwear = np.array(Image.open(run/'footwear.png').convert('RGBA'))
    feet,foot_evidence = separate_feet(footwear[...,3])
    for bone,alpha in zip(('FootL','FootR'),feet):
        pixels = footwear.copy()
        pixels[...,3] = alpha
        add(bone,pixels,{'kind':'direct neural semantic prediction + connected-component refinement',
                        'source':str(run/'footwear.png'),'sha256':sha(run/'footwear.png'),
                        'rule':foot_evidence,'quality':'semantic foot boundary, not a measured ankle or reconstructed joint'})
    owners = np.zeros(source.shape[:2],dtype=np.uint8)
    count = np.zeros(source.shape[:2],dtype=np.uint8)
    for bone,support in votes:
        owners[support] = bone
        count += support
    owners[count != 1] = 0
    visible = source[...,3]>0
    Image.fromarray(owners).save(folder/'owners-index.png')
    overlay = np.zeros_like(source)
    overlay[visible] = [100,100,100,255]
    for index,color in enumerate(PALETTE,1):
        overlay[owners == index] = [*color,255]
        pixels = source.copy()
        pixels[owners != index] = 0
        Image.fromarray(pixels).save(folder/(BONES[index-1]+'-source.png'))
    overlay[...,3] = source[...,3]
    Image.fromarray(overlay).save(folder/'owners.png')
    original.save(folder/'source.png')
    hidden = folder/'generated-candidates'
    hidden.mkdir(exist_ok=True)
    generated = []
    for path in sorted(run.glob('*.png')):
        if path.stem in ('src_img','src_head','reconstruction') or path.stem.endswith('_depth'):
            continue
        image = np.array(Image.open(path).convert('RGBA'))
        native = np.stack([project(image[...,channel],record['transform']) for channel in range(4)],axis=-1)
        # Only transparent-source locations can be unambiguously classified as
        # outside visible source art. In-silhouette occlusion remains unresolved.
        native[visible] = 0
        target = hidden/(path.stem+'.png')
        Image.fromarray(native).save(target)
        generated.append({'file':str(target),'raw_model_layer':str(path),
                          'raw_sha256':sha(path),'provenance':'generated neural RGB; nearest native sampling outside original alpha only; not accepted hidden anatomy'})
    info = {'schema':'hex-independent-neural-candidate/1','view':view,'input':record,
            'bones':BONES,'unknown_label':0,'labels':dict(enumerate(BONES,1)),
            'output_channel_contract':PART_CHANNELS,
            'foot_component_evidence':foot_evidence,
            'source_pixels':int(visible.sum()),'known_pixels':int((owners>0).sum()),
            'unknown_pixels':int((visible&(owners==0)).sum()),
            'ambiguous_vote_pixels':int((visible&(count>1)).sum()),
            'bone_pixels':{bone:int((owners==index).sum()) for index,bone in enumerate(BONES,1)},
            'decisions':provenance,'generated_art':generated,
            'limitations':['No independently inferred pelvis/spine/chest/thigh/calf joints.',
                'Feet assigned only when exactly two confident neural components exist; no inferred ankle joints.',
                'Overlapping votes remain unknown; no Legacy fallback.',
                'Generated in-silhouette hidden ownership is unresolved.'],
            'source_rgba_sha256':sha(folder/'source.png'),'owners_sha256':sha(folder/'owners-index.png')}
    (folder/'candidate.json').write_text(json.dumps(info,indent=2)+'\n')
    print(view+': '+str(info['known_pixels'])+'/'+str(info['source_pixels'])+' candidate pixels',flush=True)


if __name__ == '__main__':
    for view in SOURCES:
        key = view+'-crop-nearest-512'
        if not (OUTPUT/'runs'/key/'experiment.json').exists():
            raise FileNotFoundError('Run all four independent projections first: '+key)
        build(view,key)
