"""Read-only source adapter and explicitly heuristic anatomical observations."""
import sys
sys.dont_write_bytecode = True

import numpy as np
from PIL import Image
from scipy import ndimage

from soma_common import REPO, ROOT, VERSION, read, sha, write
from prepare import Dataset, MASK_EDITOR, owners_for

# These are anatomical hypotheses, not clothing labels or old rig coordinates.
MAPPING = {
    1: ['Hips', 'Spine1', 'Spine2', 'Chest'],
    2: ['RightHand'], 3: ['LeftHand'],
    4: ['LeftFoot', 'LeftToeBase'], 5: ['RightFoot', 'RightToeBase'],
    6: ['RightLeg', 'RightShin'], 7: ['LeftLeg', 'LeftShin'],
    8: ['RightShin', 'RightFoot'], 9: ['LeftShin', 'LeftFoot'],
    10: ['LeftArm', 'LeftForeArm'], 11: ['RightArm', 'RightForeArm'],
    12: ['LeftForeArm', 'LeftHand'], 13: ['RightForeArm', 'RightHand'],
    14: ['Neck2', 'Head', 'HeadEnd'],
}
EXPECTED = {1: [6, 7, 10, 11, 14], 2: [13], 3: [12], 4: [9], 5: [8], 6: [1, 8], 7: [1, 9], 8: [6, 5], 9: [7, 4], 10: [1, 12], 11: [1, 13], 12: [10, 3], 13: [11, 2], 14: [1]}


def analyze(entry, owners, names, review):
    chunks = []
    centers = {i: np.argwhere(owners == i)[:, ::-1].mean(0) + .5 for i in range(1, 15) if np.any(owners == i)}
    for i in range(1, 15):
        mask = owners == i
        y, x = np.nonzero(mask)
        basic = {'id': i, 'name': names[i], 'mapping': MAPPING[i], 'review': review['status'], 'review_comment': review.get('comment', ''),
                 'independent_agreement': None, 'score_kind': 'uncalibrated heuristic', 'overlap': 'exclusive owner map; hidden overlap unobservable'}
        if len(x) == 0:
            chunks.append(dict(basic, status='missing', score=0., reasons=['No owned pixels; no invented owner'], landmarks=[], neighbors=[], constraints=[], pixels=0))
            continue
        labels, count = ndimage.label(mask)
        sizes = np.bincount(labels.ravel())[1:]
        largest = sizes.max()/len(x)
        seed = float(np.mean(entry.original[mask] == i))
        border = mask & ~ndimage.binary_erosion(mask)
        flood_border = float(np.mean(entry.provenance[border] != 1))
        ring = ndimage.binary_dilation(mask, iterations=2) & ~mask
        neighbors = [int(n) for n in np.unique(owners[ring]) if n != 0]
        expected = EXPECTED[i]
        support = sum(n in neighbors for n in expected)/len(expected)
        # Area deliberately is not a reliability term. Connectivity alone cannot pass.
        classification = .85 if review['status'] == 'Accepted' else .45
        score = float(classification * (.35+.65*seed) * (.6+.4*largest) * (.6+.4*support) * (1-.3*flood_border))
        reasons = ['Owner labels are DensePose hypotheses; flood fill is not independent evidence',
                   'Visible region completeness and hidden anatomy are unverified',
                   'Contact boundaries constrain intervals, not exact joints']
        if review['status'] != 'Accepted': reasons.append('No accepted manual anatomical verification')
        if review['status'] == 'Needs review':
            score *= .5
            reasons.append('Source explicitly needs review: ' + review.get('comment', ''))
        if largest < .8: reasons.append('Disconnected contamination or occlusion cannot be distinguished')
        if support < 1: reasons.append('Expected anatomical contact absent or occluded')
        points = np.column_stack((x+.5, y+.5))
        center = points.mean(0)
        _, vectors = np.linalg.eigh(np.cov(points.T) if len(points) > 2 else np.eye(2))
        axis = vectors[:, -1]
        along = (points-center) @ axis
        lo, hi = np.quantile(along, [.05, .95])
        width = float(np.quantile(np.abs((points-center) @ np.array([-axis[1], axis[0]])), .85))
        # PCA describes mask shape only. Its endpoints are NOT anatomical joints.
        ends = [center+axis*lo, center+axis*hi]
        radius = max(2., width, (hi-lo)*.16)
        landmarks = []
        constraints = []
        chunks.append(dict(basic, status='reliable' if score>.65 and review['status']=='Accepted' else ('partial' if score>.2 else 'ambiguous'),
                           score=score, reasons=reasons, pixels=len(x), components=int(count), largest_component_fraction=float(largest),
                           original_seed_fraction=seed, inferred_boundary_fraction=flood_border,
                           completeness='visible-only; full segment unknown', contamination='possible' if count>1 else 'not excluded',
                           boundary_quality='model/flood contour; not a joint seam', expected_neighbors=expected, neighbors=neighbors,
                           landmarks=landmarks, unoriented_shape_axis=[p.tolist() for p in ends], centroid=center.tolist(), visible_span_px=float(hi-lo), width_px=width,
                           endpoint_radius_px=radius, constraints=constraints))
    return chunks


def load_case(dataset, key):
    entry, owners, mask_source = owners_for(dataset, key)
    review_data = read(MASK_EDITOR / 'review-status.json')
    review = review_data['entries'][key]
    atlas = dataset.atlases[key]
    if atlas['mirrored']:
        raise ValueError('Derived mirrors are not independent calibration observations')
    chunks = analyze(entry, owners, dataset.names, review)
    correction_path=MASK_EDITOR/'edits'/key/'metadata.json'
    correction=read(correction_path) if correction_path.exists() and mask_source=='Manually corrected' else None
    owner_sha=__import__('hashlib').sha256(owners.tobytes()).hexdigest()
    folder = ROOT / 'assets' / key
    folder.mkdir(parents=True, exist_ok=True)
    texture = entry.textures[entry.baseline]
    Image.fromarray(texture).save(folder / 'source.png')
    rgba = np.zeros_like(texture)
    rgba[:,:,:3] = dataset.colors[owners]
    rgba[:,:,3] = texture[:,:,3]
    Image.fromarray(rgba).save(folder / 'chunks.png')
    return {'version': VERSION, 'character': 'Character1', 'key': key, 'pose': atlas['pose'], 'view': atlas['direction'],
            'source': {'kind': 'provisional anatomical hypothesis', 'mask_source': mask_source, 'mask_version': '1.1.0',
                       'review_version': '1.0.0', 'review': review, 'signature': entry.signature,
                       'review_file_sha256': sha(MASK_EDITOR / 'review-status.json'),
                       'owners_sha256':owner_sha,'accepted_correction':correction,
                       'calibration_identity':{'raw_signature':entry.signature,'owners_sha256':owner_sha,'correction':correction},
                       'image_sha256': __import__('hashlib').sha256(texture.tobytes()).hexdigest(),
                       'image_identity_kind': 'native RGBA pixels sha256', 'native_size': [texture.shape[1], texture.shape[0]],
                       'baseline_skin': entry.baseline, 'mirrored': False, 'independent': True,
                       'unknown_pixels': int(np.sum(entry.alpha & (owners==0))),
                       'derived_mirrors': [k for k,a in dataset.atlases.items() if a['mirrored'] and dataset.canonical(k)==key]},
            'chunks': chunks, 'independent_segmentation': {'used': False, 'reason': 'No verified same-image, registered anatomical correspondence; clothing and repeated LayerDiff seeds are not equivalent anatomy'}}


def inventory():
    return Dataset()
