"""Run each smoke probe in its own process to release CUDA between models."""
import sys
import traceback
from common import ROOT, provenance, read, write
from models import LocalModel

key = sys.argv[1]
config = read(ROOT / 'config.json')
try:
    manifest = provenance(key, config)
    model = LocalModel(key, config)
    if key == 'fable':
        result = model.fable({'id': 'probe', 'text': 'Alice met Rowan at the bridge. Alice refused to betray him.'})
    else:
        result = model.generate([{'role': 'user', 'content': 'Return only JSON with key characters (array of names) for this text: Alice met Rowan at the bridge. Alice refused to betray him.'}])
        import json
        result['parsed'] = json.loads(result['response'])
    write(ROOT / f'provenance/probe-{key}.json', {**manifest, 'status': 'SUCCESS', 'model_metadata': model.metadata, 'result': result})
    print(key, 'SUCCESS', result.get('response', result.get('entities')))
except Exception:
    write(ROOT / f'provenance/probe-{key}.json', {'status': 'ERROR', 'traceback': traceback.format_exc()})
    raise
