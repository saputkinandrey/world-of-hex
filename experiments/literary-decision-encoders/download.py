"""Download immutable official snapshots and retain metadata evidence."""
import hashlib
from pathlib import Path

from huggingface_hub import HfApi, snapshot_download

from contracts import ROOT, read_json, write_json


def download_models(keys):
    config = read_json(ROOT / 'config.json')
    receipts_path = ROOT / 'model-paths.json'
    receipts = read_json(receipts_path) if receipts_path.exists() else {}
    for key in keys:
        spec = config['models'][key]
        target = Path(config['model_root']) / key / spec['revision']
        info = HfApi().model_info(spec['repo'], revision=spec['revision'])
        path = snapshot_download(spec['repo'], revision=spec['revision'], local_dir=target,
                                 allow_patterns=['*.json', '*.txt', '*.md', '*.safetensors', 'pytorch_model.bin'],
                                 ignore_patterns=['coreml/*'], max_workers=2)
        files = []
        for file in sorted(target.rglob('*')):
            if not file.is_file() or '.cache' in file.parts:
                continue
            sha = hashlib.sha256()
            with file.open('rb') as stream:
                for chunk in iter(lambda: stream.read(8 * 1024 * 1024), b''):
                    sha.update(chunk)
            files.append({'path': file.relative_to(target).as_posix(), 'bytes': file.stat().st_size, 'sha256': sha.hexdigest()})
        receipts[key] = {'repo': spec['repo'], 'revision': info.sha, 'path': str(Path(path).resolve()), 'files': files}
        write_json(receipts_path, receipts)
        evidence = ROOT / 'provenance' / key
        write_json(evidence / 'hub-metadata.json', {'repo': info.id, 'sha': info.sha, 'config': info.config,
                   'card': info.card_data.to_dict() if info.card_data else None,
                   'files': [item.rfilename for item in info.siblings]})
        # Retain exact source card/config alongside interpretation cards.
        for name in ['README.md', 'config.json', '1_Pooling/config.json', '1_Pooling/modules.json']:
            source = target / name
            if source.exists():
                destination = evidence / ('upstream-' + name.replace('/', '-'))
                destination.parent.mkdir(parents=True, exist_ok=True)
                destination.write_bytes(source.read_bytes())
        print(f'Downloaded {key}: {info.sha}', flush=True)
