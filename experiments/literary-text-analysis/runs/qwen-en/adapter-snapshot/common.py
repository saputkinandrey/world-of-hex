"""Small file contracts shared by the independent experiment."""
import hashlib
import json
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parents[1]
SCHEMA = '0.1.0'
CATEGORIES = {'action', 'decision', 'intention', 'retrospective', 'habit',
              'motivation', 'reaction', 'reported_behavior'}


def read(path):
    return json.loads(Path(path).read_text(encoding='utf-8-sig'))


def write(path, value):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + '.tmp')
    temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    os.replace(temporary, path)


def digest(path):
    result = hashlib.sha256()
    with Path(path).open('rb') as stream:
        for block in iter(lambda: stream.read(8 * 1024 * 1024), b''):
            result.update(block)
    return result.hexdigest()


def fingerprint(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, ensure_ascii=False).encode()).hexdigest()


def rows(path):
    return [json.loads(line) for line in Path(path).read_text(encoding='utf-8').splitlines() if line.strip()]


def write_rows(path, values):
    path = Path(path)
    temporary = path.with_suffix(path.suffix + '.tmp')
    temporary.write_text(''.join(json.dumps(row, ensure_ascii=False) + '\n' for row in values), encoding='utf-8')
    os.replace(temporary, path)


def code_hash():
    return fingerprint({p.name: digest(p) for p in sorted(ROOT.glob('*.py'))
                        if p.name in {'common.py', 'parsing.py', 'models.py', 'analysis.py', 'grounding.py', 'prompts.py'}})


def resolve_model(key, config):
    spec = config['models'][key]
    receipt = read(ROOT / spec['receipt'])[spec['receipt_key']]
    if (receipt['repo'], receipt['revision']) != (spec['repo'], spec['revision']):
        raise ValueError('Existing model receipt does not match pinned repo/revision')
    path = Path(receipt['path'])
    if not path.is_dir():
        raise FileNotFoundError(path)
    return path


def provenance(key, config):
    path = resolve_model(key, config)
    return {'schema_version': SCHEMA, 'model': key, **config['models'][key],
            'local_path': str(path), 'checkpoint_files': {
                str(p.relative_to(path)): digest(p) for p in sorted(path.rglob('*'))
                if p.is_file() and '.cache' not in p.parts},
            'processing': config, 'code_sha256': code_hash()}


def enforce_private_output(path, source_kind):
    path = Path(path).resolve()
    if source_kind == 'authored_fixture' or not path.is_relative_to(REPO):
        return
    if not any(path.is_relative_to(ROOT/folder) for folder in ['inputs','private-runs']):
        raise ValueError('Book text and derived quotations inside the repo must use ignored inputs/ or private-runs/')
