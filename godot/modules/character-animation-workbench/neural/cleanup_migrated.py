"""Remove superseded ignored raw histories only after verified persistent migration."""
import json
import shutil
from evidence_store import CURRENT, MODELS, locked, verify, write_json
from preprocess import OUTPUT, SOURCES, sha


def main():
    proof = json.loads((CURRENT/'migration.json').read_text())
    if proof.get('version') != 2:
        raise ValueError('Verified initial migration is required before cleanup')
    with locked():
        snapshots = {}
        for view in SOURCES:
            for model in MODELS:
                path,_ = verify(view,model)
                snapshots[view+'/'+model] = sha(path/'manifest.json')
        targets = [OUTPUT/name for name in ('runs','sam','heads')]
        for path in targets:
            if path.resolve() != path.absolute() or not path.resolve().is_relative_to(OUTPUT.resolve()):
                raise ValueError('Historical cleanup target is redirected or outside neural output: '+str(path))
        removed = {}
        for path in targets:
            if path.exists():
                removed[path.name] = sum(item.stat().st_size for item in path.rglob('*') if item.is_file())
                shutil.rmtree(path)
        write_json(OUTPUT/'migration-cleanup.json',{'verified_current_snapshots':snapshots,
            'removed_superseded_raw_bytes':removed,
            'preserved':'source artwork, controls, Legacy, diagnostics, current evidence and active work'})
    print(json.dumps(removed,indent=2))


if __name__ == '__main__':
    main()
