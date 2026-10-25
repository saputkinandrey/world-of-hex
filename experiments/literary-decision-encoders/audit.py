"""Audit downloaded tensor sizes and common short input budget without GPU loads."""
import math

from safetensors import safe_open
from tokenizers import Tokenizer

from contracts import ROOT, candidate_texts, read_json, write_json


def main():
    receipts = read_json(ROOT / 'model-paths.json')
    cases = read_json(ROOT / 'fixtures/short.json')['cases']
    records = {}
    from pathlib import Path
    for key, receipt in receipts.items():
        path = Path(receipt['path'])
        record = {'repo': receipt['repo'], 'revision': receipt['revision'],
                  'downloaded_bytes': sum(f['bytes'] for f in receipt['files'])}
        weights = path / 'model.safetensors'
        if weights.exists():
            with safe_open(weights, framework='pt', device='cpu') as model:
                record['published_tensor_parameters'] = sum(math.prod(model.get_slice(k).get_shape()) for k in model.keys())
                record['tensor_keys'] = list(model.keys())
        if key == 'literary_minilm':
            tokenizer = Tokenizer.from_file(str(path / 'tokenizer.json'))
            # Disable saved tokenizer policies explicitly for length auditing.
            tokenizer.no_truncation()
            tokenizer.no_padding()
            record['short_fixture_tokens'] = {case['id']: [len(tokenizer.encode(text).ids) for text in candidate_texts(case)] for case in cases}
            record['short_fixture_fits_128'] = all(length <= 128 for lengths in record['short_fixture_tokens'].values() for length in lengths)
            if not record['short_fixture_fits_128']:
                raise AssertionError('Shared fixture does not fit MiniLM 128-token context')
        records[key] = record
    write_json(ROOT / 'provenance/tensor-audit.json', records)
    print('Snapshot tensor sizes and shared MiniLM token budget verified.')


if __name__ == '__main__':
    main()
