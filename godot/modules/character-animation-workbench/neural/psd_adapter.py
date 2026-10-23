"""Materialize upstream PSD pixel+layer-mask RGBA into rig-parts wrapper input.

This is an input adapter only. No segmentation, cuts, assembly or proposal is
implemented here. Originals and raw See-through layers remain untouched.
"""
import argparse
import json
from pathlib import Path

import numpy as np
from psd_tools import PSDImage
from preprocess import sha


def export(source, output):
    output.mkdir(parents=True,exist_ok=True)
    psd = PSDImage.open(source)
    depth_path = source.with_name(source.stem+'_depth.psd')
    depth = {layer.name:layer for layer in PSDImage.open(depth_path)} if depth_path.exists() else {}
    layers,provenance = [],[]
    for index,layer in enumerate(psd):
        image = layer.composite(force=True).convert('RGBA')
        if image.size != layer.size:
            raise ValueError('PSD layer dimensions changed during compositing: '+layer.name)
        filename = f'{index:02d}.png'
        image.save(output/filename)
        median = None
        if layer.name in depth:
            depth_image = depth[layer.name].composite(force=True).convert('RGB')
            visible = np.asarray(image)[...,3] > 128
            if depth_image.size == image.size and visible.any():
                median = float(np.median(np.asarray(depth_image)[...,0][visible])/255)
        layers.append({'name':layer.name,'filename':filename,'left':layer.left,
                       'top':layer.top,'right':layer.right,'bottom':layer.bottom,
                       'depth_median':median})
        provenance.append({'name':layer.name,'file':filename,'sha256':sha(output/filename),
                           'operation':'psd-tools composite of original pixel layer and its mask',
                           'had_layer_mask':layer.has_mask()})
    # Depth-less layers must not be given invented depths; preserve PSD order.
    if any(item['depth_median'] is None for item in layers):
        for item in layers:
            item['depth_median'] = None
    (output/'layers.json').write_text(json.dumps({'width':psd.width,'height':psd.height,'layers':layers},indent=2)+'\n')
    (output/'provenance.json').write_text(json.dumps({'psd':str(source),'sha256':sha(source),
        'depth_psd':str(depth_path) if depth_path.exists() else None,
        'layers':provenance},indent=2)+'\n')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('source',type=Path)
    parser.add_argument('output',type=Path)
    args = parser.parse_args()
    export(args.source,args.output)
