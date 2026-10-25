"""Lossless model/native maps, grouped diagnostics and unchanged RGB overlays."""

import numpy as np
from PIL import Image

from core import GROUPS, COLORS, write, sha, project, native_indices


def statistics(labels, image):
    from scipy.ndimage import label
    alpha = np.asarray(image.getchannel('A'))>0
    foreground = labels!=0
    groups = {}
    for name,ids in GROUPS.items():
        mask = np.isin(labels,ids)
        _,components = label(mask)
        groups[name] = {'pixels':int(mask.sum()),'visible_pixels':int((mask & alpha).sum()),'components_4_connected':int(components),'empty':not bool(mask.any())}
    return {'source_alpha_pixels':int(alpha.sum()),'visible_pixels_segmented':int((foreground & alpha).sum()),
            'unassigned_visible_pixels':int((~foreground & alpha).sum()),'predicted_pixels_outside_alpha':int((foreground & ~alpha).sum()),
            'coverage':float((foreground & alpha).sum()/alpha.sum()) if alpha.any() else None,
            'surface_pixel_counts':{str(i):int((labels==i).sum()) for i in range(25)},'groups':groups}


def color_map(labels, alpha=None):
    result = np.zeros((*labels.shape,4),dtype=np.uint8)
    for name,ids in GROUPS.items():
        mask = np.isin(labels,ids)
        result[mask,:3] = COLORS[name]
        result[mask,3] = 255
    if alpha is not None: result[...,3] *= alpha.astype(np.uint8)
    return Image.fromarray(result)


def overlay(image, labels, clipped=False):
    canvas = Image.new('RGBA',image.size,(127,127,127,255))
    canvas.alpha_composite(image)
    color = color_map(labels,np.asarray(image.getchannel('A'))>0 if clipped else None)
    color.putalpha(color.getchannel('A').point(lambda a:round(a*0.6)))
    canvas.alpha_composite(color)
    return canvas.convert('RGB')


def save_native(folder, image, labels, uv, coarse, metadata):
    folder.mkdir(parents=True,exist_ok=True)
    native = folder/'native'
    native.mkdir(exist_ok=True)
    alpha = np.asarray(image.getchannel('A'))>0
    labels = labels.astype(np.uint8)
    image.save(folder/'source.png')
    np.save(folder/'class-map.npy',labels,allow_pickle=False)
    Image.fromarray(labels).save(folder/'class-map.png')
    color_map(labels).save(folder/'class-map-preview.png')
    color_map(labels,alpha).save(folder/'class-map-alpha-preview.png')
    overlay(image,labels).save(folder/'overlay.png')
    overlay(image,labels,True).save(folder/'overlay-alpha.png')
    np.save(native/'class-map.npy',labels,allow_pickle=False)
    np.save(native/'class-map-alpha.npy',np.where(alpha,labels,0).astype(np.uint8),allow_pickle=False)
    np.save(native/'coarse-map.npy',coarse.astype(np.uint8),allow_pickle=False)
    # U/V are intrinsic chart coordinates. Sample exactly the same pixel as I;
    # no interpolation across chart boundaries, U inversion or body-part swap.
    np.savez_compressed(native/'uv.npz',uv=uv)
    (folder/'masks').mkdir(exist_ok=True)
    for name,ids in GROUPS.items():
        Image.fromarray(np.isin(labels,ids).astype(np.uint8)*255).save(folder/'masks'/(name+'.png'))
    metadata['diagnostics'] = statistics(labels,image)
    metadata['native_size'] = list(image.size)
    metadata['uv_projection'] = 'Same nearest sample as I; intrinsic chart coordinates unchanged.'
    metadata['groups'] = GROUPS
    metadata['palette_rgb'] = COLORS
    required = ['source.png','class-map.npy','class-map.png','class-map-preview.png','overlay.png','overlay-alpha.png','native/class-map.npy','native/class-map-alpha.npy','native/coarse-map.npy','native/uv.npz']
    required += ['masks/'+name+'.png' for name in GROUPS]
    metadata['artifact_sha256'] = {name:sha(folder/name) for name in required}
    metadata['status'] = 'SUCCESS'
    write(folder/'metadata.json',metadata)


def save_inference(folder, image, prepared, transform, result, metadata):
    import torch
    folder.mkdir(parents=True,exist_ok=True)
    raw_folder = folder/'raw'
    raw_folder.mkdir(exist_ok=True)
    prepared.save(raw_folder/'predictor-input.png')
    raw = result['raw']
    raw_files = {}
    for name,value in raw.items():
        if not np.isfinite(value).all(): raise ValueError('Nonfinite DensePose tensor: '+name)
        # Old helper's fixed 150-grid output is retained with an explicit name.
        stored = 'legacy-uv-150' if name=='uv-native' else name
        path = raw_folder/(stored+'.npz')
        np.savez_compressed(path,values=value)
        raw_files[stored] = {'file':path.name,'shape':list(value.shape),'dtype':str(value.dtype),'sha256':sha(path)}
    model_map = result['class_map']
    np.save(raw_folder/'class-map.npy',model_map,allow_pickle=False)
    yy,xx = native_indices(transform,model_map.shape)
    transform = dict(transform,inverse_sample_x=xx.tolist(),inverse_sample_y=yy.tolist(),
                     nearest_policy='Pillow NEAREST pixel-center samples; exact indices retained including tie resolution.')
    labels = project(model_map,transform)
    uv = project(raw['uv-model-grid'],transform)
    scores = raw['scores']
    selected = int(scores.argmax()) if len(scores) else None
    coarse = np.zeros(model_map.shape,dtype=np.uint8)
    if selected is not None:
        values = raw[f'instance_{selected}_labels']
        box = raw['boxes_xyxy'][selected]
        x,y = box[:2].astype(int)
        h,w = values.shape
        resized = torch.nn.functional.interpolate(torch.from_numpy(raw['predictor_coarse_segm'][selected:selected+1]),size=(h,w),mode='bilinear',align_corners=False)[0].argmax(0).numpy()
        x0,y0,x1,y1 = max(0,x),max(0,y),min(model_map.shape[1],x+w),min(model_map.shape[0],y+h)
        coarse[y0:y1,x0:x1] = resized[y0-y:y1-y,x0-x:x1-x]
    np.save(raw_folder/'coarse-map.npy',coarse,allow_pickle=False)
    boxes = raw['boxes_xyxy']
    native_boxes = boxes.copy()
    if len(boxes):
        cw,ch = transform['canvas_size']
        iw,ih = transform['predictor_input_size']
        ox,oy = transform['source_offset_xy']
        native_boxes = boxes*np.array([cw/iw,ch/ih,cw/iw,ch/ih])-np.array([ox,oy,ox,oy])
    metadata.update(transform=transform,raw_tensors=raw_files,
                    detections={'count':len(scores),'scores':scores.tolist(),'boxes_predictor_xyxy':boxes.tolist(),'boxes_native_xyxy':native_boxes.tolist(),
                                'selected_detection_id':selected,'selected_score':float(scores[selected]) if selected is not None else None,
                                'other_detection_ids':[i for i in range(len(scores)) if i!=selected]},
                    coarse_segmentation={'available':selected is not None,'channels':raw['predictor_coarse_segm'].shape[1] if selected is not None else None,
                                         'projection':'Official bilinear coarse logits to bbox, argmax; then same nearest native coordinates.'})
    save_native(folder,image,labels,uv,project(coarse,transform),metadata)


def save_mirrored(folder, source_folder, image, metadata):
    source = __import__('core').read(source_folder/'metadata.json')
    labels = np.load(source_folder/'class-map.npy')[:,::-1].copy()
    uv = np.load(source_folder/'native/uv.npz')['uv'][:,:,::-1].copy()
    coarse = np.load(source_folder/'native/coarse-map.npy')[:,::-1].copy()
    detections = dict(source['detections'])
    boxes = np.asarray(detections['boxes_native_xyxy']).reshape(-1,4)
    if len(boxes):
        boxes = boxes.copy()
        boxes[:,[0,2]] = image.width-boxes[:,[2,0]]
    detections['boxes_native_xyxy'] = boxes.tolist()
    detections['boxes_predictor_xyxy'] = None
    metadata.update(detections=detections,transform={'source_native_size':list(image.size),'mapping':'x_target = width - 1 - x_source; pixel-center reflection',
                      'surface_id_permutation':'identity','uv_value_transform':'identity; spatial reflection only'},
                    mirrored_from=str(source_folder.relative_to(__import__('core').ROOT)),
                    raw_outputs_reference=str((source_folder/'raw').relative_to(__import__('core').ROOT)),
                    coarse_segmentation=source['coarse_segmentation'])
    (folder/'raw').mkdir(parents=True,exist_ok=True)
    write(folder/'raw/source-reference.json',{'source':metadata['raw_outputs_reference'],'no_independent_inference':True})
    save_native(folder,image,labels,uv,coarse,metadata)
