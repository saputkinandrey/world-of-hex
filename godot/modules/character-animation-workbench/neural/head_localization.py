"""Confidence/component head localization using only neural alpha predictions."""
import json
from pathlib import Path

import cv2
import numpy as np


def head_support(alpha, report=None):
    candidates = []
    for threshold in (64,128,192):
        count,labels,stats,_ = cv2.connectedComponentsWithStats((alpha > threshold).astype(np.uint8),8)
        for index in range(1,count):
            x,y,width,height,area = map(int,stats[index])
            if area < 16:
                continue
            mass = int(alpha[labels == index].sum())
            candidates.append({'threshold':threshold,'component':index,
                               'bbox':[x,y,width,height],'area':area,'mass':mass})
    if not candidates:
        raise ValueError('Neural head prediction has no confident connected component')
    # The strongest confidence-128 component rejects low-alpha full-canvas residue.
    preferred = [item for item in candidates if item['threshold'] == 128]
    selected = max(preferred or candidates,key=lambda item:item['mass'])
    _,labels = cv2.connectedComponents((alpha > selected['threshold']).astype(np.uint8),8)
    support = (labels == selected['component']).astype(np.uint8)
    if report:
        original = cv2.boundingRect(cv2.findNonZero((alpha > 15).astype(np.uint8)))
        Path(report).write_text(json.dumps({'original_alpha15_bbox':original,
            'selected':selected,'candidates':candidates,
            'provenance':'neural head alpha only; no Legacy masks or landmarks'},indent=2)+'\n')
    return support
