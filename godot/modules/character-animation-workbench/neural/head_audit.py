"""Verify the complete ten-trial dataset and the protected current evidence."""
import json
from pathlib import Path

from evidence_store import CURRENT, MODELS, inventory, validate_payload, write_json
from head_runs import BATCH, SEEDS, evaluation_seeds
from preprocess import sha


def main():
    config = json.loads((BATCH/'experiment.json').read_text())
    if inventory(CURRENT) != config['current_inventory_before']:
        raise ValueError('Protected current evidence differs from pre-benchmark inventory')
    if sha(config['input']['source']) != config['input']['source_sha256']:
        raise ValueError('Original SW sprite changed')
    rows = []
    seeds = evaluation_seeds()
    for number,seed in enumerate(seeds,1):
        for model in MODELS:
            folder = BATCH/f'run-{number:02d}'/model
            manifest = json.loads((folder/'manifest.json').read_text())
            if inventory(folder) != manifest['files']:
                raise ValueError('Changed experimental evidence: '+str(folder))
            actual = manifest['parameters']
            if actual != {'seed':seed,'steps':20,'resolution':512,'depth_resolution':512} or manifest['cache_used']:
                raise ValueError('Incorrect actual benchmark settings: '+str(folder))
            if sha(folder/'input.png') != config['input']['input_sha256']:
                raise ValueError('Inconsistent model input: '+str(folder))
            if manifest['outcome']=='completed':
                validate_payload(folder,manifest)
                if manifest['provenance']['parameters'] != actual:
                    raise ValueError('Worker numerical settings differ from request: '+str(folder))
            rows.append({'run':number,'seed':seed,'model':model,'outcome':manifest['outcome'],
                         'manifest_sha256':sha(folder/'manifest.json'),'files':len(manifest['files'])})
    suspended = []
    for number in range(len(seeds)+1,len(SEEDS)+1):
        for model in MODELS:
            directory = BATCH/f'run-{number:02d}'/model
            manifest = json.loads((directory/'manifest.json').read_text())
            if manifest['outcome']!='not_attempted_user_stop' or manifest['executed'] or inventory(directory):
                raise ValueError('Unexpected execution beyond user boundary: '+str(directory))
            suspended.append({'run':number,'model':model,'outcome':'not_attempted_user_stop'})
    result = {'current_unchanged':True,'original_source_unchanged':True,'executed_evaluations':len(seeds),
              'original_planned_evaluations':len(SEEDS),'unattempted':suspended,
              'actual_attempt_records':len(rows),'records':rows,
              'dataset_bytes_excluding_audit':sum(p.stat().st_size for p in BATCH.rglob('*') if p.is_file() and p.name!='audit.json')}
    write_json(BATCH/'audit.json',result)
    print(json.dumps({'records':len(rows),'current_unchanged':True,
                      'dataset_bytes':sum(p.stat().st_size for p in BATCH.rglob('*') if p.is_file())},indent=2))
    return result


if __name__=='__main__':
    main()
