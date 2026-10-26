"""Snapshot and verify only the explicitly relevant historical trees/checkpoints."""
import sys
from common import REPO, ROOT, digest, read, write

EXCLUDED = {'.venv', '__pycache__', '.cache', 'cache'}


def historical_files():
    import os
    for name in ['character-decisions', 'literary-decision-encoders']:
        base = REPO / 'experiments' / name
        for folder, directories, files in os.walk(base):
            directories[:] = [d for d in directories if d not in EXCLUDED]
            for name in files:
                path = __import__('pathlib').Path(folder) / name
                yield path


def snapshot():
    path = ROOT / 'provenance/protected-before.json'
    if path.exists():
        raise FileExistsError(path)
    write(path, {str(p.relative_to(REPO)): digest(p) for p in historical_files()})


def verify():
    before = read(ROOT / 'provenance/protected-before.json')
    changed = [p for p, value in before.items() if not (REPO / p).is_file() or digest(REPO / p) != value]
    write(ROOT / 'provenance/protected-after.json', {'checked_files': len(before), 'changed': changed})
    if changed:
        raise ValueError(changed)
    print(f'Historical files unchanged: {len(before)}')


if __name__ == '__main__':
    snapshot() if sys.argv[1] == 'snapshot' else verify()
