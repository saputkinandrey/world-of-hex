"""Structural/provenance checks, explicitly not an anatomical quality score."""
import json
import cv2
import numpy as np
from PIL import Image
from candidates import BONES
from preprocess import OUTPUT, SOURCES, frame, sha


def main():
    results = {}
    for view in SOURCES:
        folder = OUTPUT/'candidates'/(view+'-crop-nearest-512')
        info = json.loads((folder/'candidate.json').read_text())
        source = np.asarray(frame(view)[0])
        preserved = np.asarray(Image.open(folder/'source.png').convert('RGBA'))
        np.testing.assert_array_equal(preserved,source)
        owners = np.asarray(Image.open(folder/'owners-index.png'))
        if not np.isin(owners,np.arange(15)).all():
            raise ValueError('Candidate has labels outside Unknown + fourteen bones: '+view)
        if (owners[source[...,3]==0]>0).any():
            raise ValueError('Candidate assigns transparent source pixels: '+view)
        for index,bone in enumerate(BONES,1):
            pixels = np.asarray(Image.open(folder/(bone+'-source.png')).convert('RGBA'))
            selected = owners == index
            np.testing.assert_array_equal(pixels[selected],source[selected])
            if pixels[~selected].any():
                raise ValueError('Source chunk leaks pixels from another assignment: '+view+'/'+bone)
        if sha(folder/'owners-index.png') != info['owners_sha256']:
            raise ValueError('Candidate hash mismatch: '+view)
        components = {}
        for index,bone in enumerate(BONES,1):
            _,_,stats,_ = cv2.connectedComponentsWithStats((owners==index).astype(np.uint8),8)
            components[bone] = sorted(stats[1:,cv2.CC_STAT_AREA].tolist(),reverse=True)
        results[view] = {'source_rgba_exact':True,'all_fourteen_source_chunks_exact':True,
                         'unknown_explicit':info['unknown_pixels'],'eight_connected_component_sizes':components,
                         'anatomical_quality':'not established by these checks'}
    (OUTPUT/'candidate-validation.json').write_text(json.dumps(results,indent=2)+'\n')
    print(json.dumps(results,indent=2))


if __name__ == '__main__':
    main()
