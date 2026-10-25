"""Resume only unattempted seeds of an existing body-only experiment."""
import argparse
import json
from pathlib import Path
import traceback

import numpy as np
from PIL import Image

from evidence_store import BODY_TAGS, inventory, locked, validate_payload, write_json
from head_runs import body_diagnostics, execute_model
from infer import settings
from inference_parameters import parameters
from inference_recipe import contract
from preprocess import OUTPUT, REPO, sha


def validate_history(output, status, config, recipe):
    for number, row in enumerate(status['results'], 1):
        if row['run'] != number or row['seed'] != config['seeds'][number - 1]:
            raise ValueError('Recorded runs do not match the planned contiguous seed sequence')
        folder = output / f'run-{number:02d}' / 'layerdiff'
        manifest = json.loads((folder / 'manifest.json').read_text(encoding='utf-8'))
        expected = parameters({'parameters': {'seed': row['seed'], 'steps': config['steps'],
                                              'resolution': config['resolution'], 'depth_resolution': config['resolution']}})
        if manifest['parameters'] != expected or manifest['contract'] != recipe or manifest['outcome'] != row['outcome']:
            raise ValueError('Recorded inference contract changed: ' + str(folder))
        if inventory(folder) != manifest['files']:
            raise ValueError('Recorded raw evidence changed: ' + str(folder))
        if row['outcome'] == 'completed':
            validate_payload(folder, manifest)


def resume(plan):
    config = json.loads(Path(plan).read_text(encoding='utf-8'))
    output = (REPO / config['output']).resolve()
    stored = json.loads((output / 'plan.json').read_text(encoding='utf-8'))
    if stored['requested'] != config:
        raise ValueError('Resume plan differs from the original experiment')
    tooling, upstream, _ = settings()
    recipe = {**contract('layerdiff', tooling, upstream), 'mode': 'body-only',
              'preprocessing_sha256': sha(Path(__file__).with_name('preprocess.py')),
              'guidance_scale': 1.0, 'strength': 1.0, 'body_tags': BODY_TAGS}
    recipe.pop('head_support_sha256', None)
    recipe['head_policy'] = 'not requested: body-only'
    if recipe != stored['contract']:
        raise ValueError('Resume implementation or checkpoint contract changed')
    record = stored['input']
    if sha(record['input']) != record['input_sha256'] or sha(record['source']) != record['source_sha256']:
        raise ValueError('Resume source/input checksum changed')
    with locked(OUTPUT / 'work/session'):
        status = json.loads((output / 'status.json').read_text(encoding='utf-8'))
        validate_history(output, status, config, recipe)
        start = len(status['results'])
        with Image.open(output / 'input/source.png') as image:
            alpha = np.asarray(image.getchannel('A'))
        print(f'Resume verified: {start} recorded attempts retained; starting run {start + 1}.', flush=True)
        status.pop('paused_after_run', None)
        status.pop('pause_reason', None)
        write_json(output / 'status.json', status)
        for number, seed in enumerate(config['seeds'][start:], start + 1):
            folder = output / f'run-{number:02d}'
            if folder.exists():
                raise ValueError('Unrecorded attempt exists; refusing overwrite or retry: ' + str(folder))
            options = parameters({'parameters': {'seed': seed, 'steps': config['steps'],
                                                  'resolution': config['resolution'], 'depth_resolution': config['resolution']}})
            try:
                result = execute_model('layerdiff', record, folder / 'layerdiff', options, recipe, mode='body-only')
                write_json(folder / 'diagnostics.json', body_diagnostics(folder / 'layerdiff', record, alpha, config['diagnostic_alpha_threshold']))
                row = {'run': number, 'seed': seed, 'outcome': result['outcome']}
            except Exception:
                detail = traceback.format_exc()
                traceback.print_exc()
                row = {'run': number, 'seed': seed, 'outcome': 'execution_setup_or_diagnostics_failure', 'error': detail}
                write_json(folder / 'failure.json', row)
            status['results'].append(row)
            write_json(output / 'status.json', status)
    return any(row['outcome'] != 'completed' for row in status['results'])


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--plan', required=True, type=Path)
    args = parser.parse_args()
    raise SystemExit(1 if resume(args.plan) else 0)
