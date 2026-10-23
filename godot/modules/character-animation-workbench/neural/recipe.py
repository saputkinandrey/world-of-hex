"""Strict experiment identity: changed recipes never silently reuse old outputs."""
import hashlib
import json
import re
from preprocess import sha


def fingerprint(kind, files, parameters, upstream=None):
    record = {'kind':kind,'parameters':parameters,
              'files':{str(path):sha(path) for path in files}}
    if upstream:
        record['upstream_files'] = {name:sha(upstream/name) for name in [
            'common/modules/layerdiffuse/diffusers_kdiffusion_sdxl.py',
            'inference/scripts/inference_psd_quantized.py']}
    record['sha256'] = hashlib.sha256(json.dumps(record,sort_keys=True).encode()).hexdigest()
    return record


def require_same(previous, current):
    if previous.get('recipe',{}).get('sha256') != current['sha256']:
        raise ValueError('Experiment recipe changed or historical recipe is unverified; retain existing evidence and select a new output key. No automatic GPU rerun.')


def require_input(previous, current):
    for field in ('source_sha256','input_sha256','transform'):
        if previous[field] != current[field]:
            raise ValueError('Experiment input identity changed: '+field)
    if sha(current['input']) != current['input_sha256']:
        raise ValueError('Experiment input bytes changed: '+str(current['input']))


def attempt_folder(root, label):
    if label is None:
        return root
    if not re.fullmatch(r'[a-z0-9][a-z0-9-]{0,40}',label):
        raise ValueError('Attempt must be a short lowercase alphanumeric/hyphen label')
    return root.with_name(root.name+'--'+label)
