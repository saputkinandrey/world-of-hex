"""Preserve model memberships; projections and alpha crops are separate diagnostics."""
import colorsys
import shutil

import numpy as np
from PIL import Image

from common import write

GROUP_COLORS = {'upper_arm': (235,91,64), 'lower_arm': (245,186,45),
                'upper_leg': (65,153,229), 'lower_leg': (59,201,142),
                'torso': (165,100,220), 'head': (240,137,192)}


def primary_aliases(folder):
    primary = folder/'south-west-nearest'
    for name in ['class-map-native.png','class-map-native.npy','class-map-preview.png','overlay-original.png','labels.json']:
        if not (folder/name).exists():
            shutil.copy2(primary/name,folder/name)
    if not (folder/'primary-metadata.json').exists():
        shutil.copy2(primary/'metadata.json',folder/'primary-metadata.json')
    for name in ['raw','masks']:
        (folder/name).mkdir(exist_ok=True)
        for source in (primary/name).iterdir():
            if not (folder/name/source.name).exists():
                shutil.copy2(source,folder/name/source.name)


def class_color(index, name):
    for key, color in GROUP_COLORS.items():
        if key in name.lower() or (key=='head' and ('face' in name.lower() or name.lower()=='head')):
            if name.lower().startswith('right'):
                return tuple(round(channel*0.72) for channel in color)
            return color
    return tuple(round(v*255) for v in colorsys.hsv_to_rgb((index*0.61803398875)%1,0.55,0.9))


def project(array, size=(150,150)):
    if array.ndim == 2:
        return np.array(Image.fromarray(array.astype(np.int32), mode='I').resize(size, Image.Resampling.NEAREST)).astype(np.int16)
    return np.stack([project(channel,size) for channel in array])


def sampling_indices(shape):
    height,width = shape[-2:]
    xx = np.array(Image.fromarray(np.arange(width,dtype=np.int32)[None]).resize((150,1),Image.Resampling.NEAREST))[0]
    yy = np.array(Image.fromarray(np.arange(height,dtype=np.int32)[:,None]).resize((1,150),Image.Resampling.NEAREST))[:,0]
    return {'x':xx.tolist(),'y':yy.tolist(),
            'policy':'Pillow 12.1.1 NEAREST. At exactly equidistant pixel-center ties either nearest neighbor is valid; recorded indices preserve the actual floating-point tie resolution.'}


def save_outputs(folder, result, original, transform, metrics, detail):
    native = project(result['class_map'])
    transform['inverse_sampling_model_grid'] = sampling_indices(result['class_map'].shape)
    multilabel = result.get('multilabel', False)
    labels = result['labels']
    background = result['background_id']
    alpha = np.array(original.getchannel('A'))>0
    masks = {}
    colors = []
    for index, name in labels.items():
        if index == background:
            continue
        mask = native[index] == index if multilabel else native == index
        masks[name] = mask
        colors.append((mask, class_color(index,name)))
        for directory, value in [('masks',mask),('masks-alpha',mask & alpha)]:
            (folder/directory).mkdir(exist_ok=True)
            Image.fromarray(value.astype(np.uint8)*255).save(folder/directory/(name+'.png'))
    foreground = np.any(np.stack(list(masks.values())),axis=0)
    np.save(folder/'class-map-native.npy',native,allow_pickle=False)
    if multilabel:
        packed = np.zeros((150,150),dtype=np.uint32)
        for index in labels:
            packed |= ((native[index] == index).astype(np.uint32)<<index)
        encoded = np.stack([packed & 255,(packed>>8)&255,(packed>>16)&255],axis=-1).astype(np.uint8)
        Image.fromarray(encoded).save(folder/'class-map-native.png')
        encoding = 'Numpy Cx150x150: channel c contains native class ID c or -1; overlaps retained. PNG RGB packs 24-bit membership bitset, not display colors.'
        clipped = np.where(alpha[None],native,-1)
    else:
        Image.fromarray(np.where(native<0,65535,native).astype(np.uint16)).save(folder/'class-map-native.png')
        encoding = 'Native integer class IDs. PNG uint16 encodes -1 background as 65535; NPY retains -1.'
        clipped = np.where(alpha,native,background)
    np.save(folder/'class-map-alpha.npy',clipped,allow_pickle=False)
    rgb = np.zeros((150,150,3),dtype=np.float32)
    count = np.zeros((150,150),dtype=np.int32)
    for mask, color in colors:
        rgb[mask] += color
        count[mask] += 1
    rgb /= np.maximum(count[...,None],1)
    preview = np.concatenate([rgb.astype(np.uint8),(foreground*255).astype(np.uint8)[...,None]],axis=-1)
    Image.fromarray(preview).save(folder/'class-map-preview.png')
    preview_alpha = preview.copy()
    preview_alpha[~alpha,3] = 0
    Image.fromarray(preview_alpha).save(folder/'class-map-alpha-preview.png')
    base = Image.new('RGBA',(150,150),(127,127,127,255))
    base.alpha_composite(original)
    overlay = preview.copy()
    overlay[...,3] = (overlay[...,3]*0.6).astype(np.uint8)
    base.alpha_composite(Image.fromarray(overlay))
    base.convert('RGB').save(folder/'overlay-original.png')
    overlay[~alpha,3] = 0
    clipped_base = Image.new('RGBA',(150,150),(127,127,127,255))
    clipped_base.alpha_composite(original)
    clipped_base.alpha_composite(Image.fromarray(overlay))
    clipped_base.convert('RGB').save(folder/'overlay-alpha.png')
    (folder/'raw').mkdir(exist_ok=True)
    np.save(folder/'raw/class-map-model-grid.npy',result['class_map'],allow_pickle=False)
    for name, array in result.get('raw',{}).items():
        np.savez_compressed(folder/'raw'/(name+'.npz'),values=array)
    frame = transform['source_frame']
    if frame:
        x,y = frame['source_to_canvas_offset_xy']
        width,height = frame['source_frame_size']
        np.save(folder/'raw/class-map-source-frame.npy',native[...,y:y+height,x:x+width],allow_pickle=False)
    write(folder/'labels.json',{'native_labels': labels, 'background_id': background, 'encoding': encoding,
          'groups': detail.get('groups',{}), 'class_colors_rgb': {name:list(class_color(index,name)) for index,name in labels.items()}})
    write(folder/'metadata.json',{'transform':transform,'metrics':metrics,
          'model_output_shape':list(result['class_map'].shape),'native_shape':list(native.shape),
          'multilabel':multilabel,'predicted_pixels_outside_source_alpha':int((foreground & ~alpha).sum()),
          'visible_alpha_pixels_predicted':int((foreground & alpha).sum()),'source_alpha_pixels':int(alpha.sum()),
          'predicted_foreground_pixels':int(foreground.sum()),
          'overlapping_class_pixels':int((count>1).sum()),
          'class_pixel_counts':{name:int(mask.sum()) for name,mask in masks.items()},
          'postprocessing':'None. Nearest coordinate projection only; alpha-clipped diagnostics do not replace predictions.'})
