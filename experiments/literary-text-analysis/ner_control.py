"""NER-only comparison: the same English paragraph, no previous text or memory."""
import copy
import json
import traceback

from common import ROOT, digest, fingerprint, provenance, read, write
from grounding import normalize
from prompts import messages


def run():
    folder = ROOT/'controls/qwen-ner-en'
    document = read(ROOT/'fixtures/document-en.json')
    config = copy.deepcopy(read(ROOT/'config.json'))
    config.update({'previous_paragraphs':0,'registry_limit':0,'qwen_stages':['mentions'],
                   'protocol':'independent_current_paragraph_only_no_state'})
    config['generation']['max_new_tokens'] = 512
    manifest = provenance('qwen', config)
    manifest.update({'source_sha256':document['source_sha256'], 'range':[0,len(document['paragraphs'])],
                     'control_script_sha256':digest(__file__)})
    contract = fingerprint(manifest)
    manifest['run_sha256'] = contract
    if (folder/'run.json').exists() and read(folder/'run.json') != manifest:
        raise ValueError('NER control contract changed; completed outputs are protected')
    if not (folder/'run.json').exists():
        write(folder/'run.json', manifest)
    completed = []
    for path in sorted((folder/'records').glob('*.json')):
        item = read(path)
        checksum = item.get('record_sha256')
        if item['run_sha256'] != contract or checksum != fingerprint({k:v for k,v in item.items() if k != 'record_sha256'}) or digest(folder/item['raw_file']) != item['raw_sha256']:
            raise ValueError(f'NER control output changed: {path}')
        completed.append(item)
    if len(completed) == len(document['paragraphs']):
        print('NER control: all records reused; no model loaded')
        return
    from models import LocalModel
    model = LocalModel('qwen', config)
    write(folder/'model.json', {**manifest, **model.metadata})
    for paragraph in document['paragraphs']:
        path = folder/'records'/f'{paragraph["ordinal"]:05d}.json'
        if path.exists():
            continue
        raw_file = f'model_outputs/qwen/{paragraph["ordinal"]:05d}.json'
        if (folder/raw_file).exists():
            raw = read(folder/raw_file)
            if raw['run_sha256'] != contract:
                raise ValueError('Interrupted NER output has a different contract')
        else:
            raw = model.generate(messages(paragraph, [], {'provisional':True,'characters':[],'recent_attributions':[]}, 'mentions'))
            raw.update(manifest)
            write(folder/raw_file, raw)
        item = {**manifest, 'paragraph_id':paragraph['id'], 'source_text':paragraph['text'],
                'raw_file':raw_file,'raw_sha256':digest(folder/raw_file), 'identity_scope':'paragraph_local_not_coreference'}
        try:
            if raw['hit_output_cap']:
                raise ValueError('NER output cap reached')
            payload = json.loads(raw['response'])
            normalized = normalize({'mentions':payload['mentions'],'observations':[],'links':[],'revisions':[]}, paragraph, [], [])
            for mention in normalized['mentions']:
                if mention['character_id'] not in {'unknown','ambiguous'}:
                    mention['character_id'] = paragraph['id'] + ':' + mention['character_id']
            item.update({'status':'SUCCESS','mentions':normalized['mentions'],'rejected':normalized['rejected']})
        except Exception as error:
            item.update({'status':'ERROR','mentions':[],'rejected':[],
                         'error':{'type':type(error).__name__,'message':str(error),'traceback':traceback.format_exc()}})
        item['record_sha256'] = fingerprint(item)
        write(path, item)
        completed.append(item)
        write(folder/'results.json', {**manifest,'paragraphs':sorted(completed,key=lambda r:r['paragraph_id'])})
        print(f'NER control {len(completed)}/{len(document["paragraphs"])} {item["status"]}', flush=True)


if __name__ == '__main__':
    run()
