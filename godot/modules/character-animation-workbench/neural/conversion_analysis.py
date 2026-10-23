"""Expose semantic information not transferred into fourteen-bone ownership."""
import json
import numpy as np
from PIL import Image
from candidates import BONES
from evidence_store import CLASSES, locked, verify, write_json
from preprocess import OUTPUT, SOURCES, frame, project, sha
from raw_analysis import sheet


def main():
    report = {}
    with locked():
        for view in SOURCES:
            evidence,manifest = verify(view,'semantic-sam')
            logits = np.load(evidence/'raw/logits.npz')['logits']
            image,_ = frame(view)
            source = np.asarray(image)
            visible = source[...,3]>0
            candidate = OUTPUT/'candidates'/view
            info = json.loads((candidate/'candidate.json').read_text())
            require_source = info['input']['source_sha256'] == manifest['input']['source_sha256']
            if not require_source:
                raise ValueError('Candidate and raw SAM refer to different source art: '+view)
            owners = np.array(Image.open(candidate/'owners-index.png'))
            panels = [('Source',image),('14-bone owners',Image.open(candidate/'owners.png'))]
            rows = {}
            for index,name in enumerate(CLASSES):
                support = (project(logits[index],manifest['input']['transform'])>0)&visible
                rows[name] = {'positive_source_px':int(support.sum()),
                    'still_unknown_px':int((support&(owners==0)).sum()),
                    'overlaps_owned_px':int((support&(owners>0)).sum()),
                    'overlap_by_bone':{bone:int((support&(owners==i)).sum()) for i,bone in enumerate(BONES,1)},
                    'used_by_candidates':False,
                    'reason':'19-class semantic region does not independently identify skeletal joints or left/right fourteen-bone boundaries'}
                if name in ('topwear','handwear','legwear','footwear'):
                    values = source.copy()
                    values[~support] = 0
                    panels.append((name+' omitted from owners',Image.fromarray(values)))
            target = OUTPUT/'analysis/conversion'/view
            target.mkdir(parents=True,exist_ok=True)
            sheet(panels,target/'semantic-to-bone-loss.png',columns=3)
            report[view] = {'sam_manifest_sha256':sha(evidence/'manifest.json'),
                'candidate_sha256':sha(candidate/'owners-index.png'),'classes':rows,
                'decision':'Preserve and expose semantic support; no forced Chest/Calf assignment from topwear/legwear.'}
        write_json(OUTPUT/'analysis/conversion-loss.json',report)
    return report


if __name__ == '__main__':
    main()
