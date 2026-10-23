"""Individual LayerDiff debugging entrypoint; full evaluation lives in full.py."""
import argparse
import json
from pathlib import Path
from preprocess import OUTPUT, REPO, SOURCES


def settings():
    tooling = Path(json.loads((REPO/'tmp/animation-workbench/seethrough-probe/runtime.json').read_text(encoding='utf-8'))['tooling'])
    upstream = tooling/'see-through-windows/see-through'
    return tooling,upstream,upstream/'.venv/Scripts/python.exe'


def main(keys, force=False):
    from inference_jobs import attempt_one
    from evidence_store import locked
    records = json.loads((OUTPUT/'inputs.json').read_text())
    keys = keys or [view+'-crop-nearest-512' for view in SOURCES]
    failed = []
    with locked(OUTPUT/'work/session'):
        for key in keys:
            view = next((view for view in SOURCES if key.startswith(view+'-crop-')),None)
            if view is None:
                raise ValueError('Individual inference requires a supported authored view: '+key)
            if attempt_one(view,'layerdiff',records[key],force) is None:
                failed.append(key)
    if failed:
        raise SystemExit('LayerDiff inference failures: '+', '.join(failed))


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('keys',nargs='*')
    parser.add_argument('--force',action='store_true')
    args = parser.parse_args()
    main(args.keys,args.force)
