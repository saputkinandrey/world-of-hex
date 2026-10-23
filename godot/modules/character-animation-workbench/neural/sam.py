"""Individual SemanticSam debugging entrypoint, separate from full evaluation."""
import argparse
import json
import os
from evidence_store import CLASSES, locked
from infer import settings
from inference_recipe import SAM_MODEL as MODEL, SAM_REVISION as REVISION
from preprocess import OUTPUT, SOURCES


def main(action, force=False):
    if action == 'download':
        tooling,_,_ = settings()
        os.environ['HF_HOME'] = str(tooling/'cache/huggingface')
        from huggingface_hub import hf_hub_download
        print(hf_hub_download(MODEL,'checkpoint-18000.pt',revision=REVISION),flush=True)
        return
    from inference_jobs import attempt_one
    records = json.loads((OUTPUT/'inputs.json').read_text())
    failed = []
    with locked(OUTPUT/'work/session'):
        for view in SOURCES:
            if attempt_one(view,'semantic-sam',records[view+'-crop-nearest-512'],force) is None:
                failed.append(view)
    if failed:
        raise SystemExit('SemanticSam inference failures: '+', '.join(failed))


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('action',choices=['download','infer'])
    parser.add_argument('--force',action='store_true')
    args = parser.parse_args()
    main(args.action,args.force)
