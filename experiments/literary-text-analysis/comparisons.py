"""Side-by-side review material; model outputs never become reference labels."""
from common import ROOT, SCHEMA, read, rows, write


def build():
    base = ROOT/'runs'
    fable, english, russian = [base/name for name in ['final-fable-en','final-qwen-en','final-qwen-ru']]
    manifests = [read(folder/'run.json') for folder in [fable,english,russian]]
    if manifests[0]['source_sha256'] != manifests[1]['source_sha256'] or manifests[0]['range'] != manifests[1]['range']:
        raise ValueError('NER comparison requires identical English source and range')
    document = read(english/'document.json')
    fable_mentions = read(fable/'characters.json')['character_mentions']
    qwen_mentions = rows(english/'mentions.jsonl')
    control = read(ROOT/'controls/qwen-ner-en/results.json')
    if control['source_sha256'] != manifests[0]['source_sha256']:
        raise ValueError('Stateless NER control source differs from FABLE')
    stateless = {p['paragraph_id']:p for p in control['paragraphs']}
    stamp = {'schema_version':SCHEMA,'model':['fable','qwen'],
             'checkpoint_revision':{m['model']:m['revision'] for m in manifests},
             'processing':{str(i):m['processing'] for i,m in enumerate(manifests)},
             'run_sha256':[m['run_sha256'] for m in manifests], 'annotation_status':'unreviewed',
             'quality_metrics':'not_measured_no_independent_gold'}
    name_comparison = []
    for paragraph in document['paragraphs']:
        pid = paragraph['id']
        name_comparison.append({'paragraph_id':pid,'source':paragraph['text'],
            'fable_CHA':[m for m in fable_mentions if m['paragraph_id'] == pid],
            'qwen_stateless_NER':stateless[pid]['mentions'],
            'qwen_stateless_status':stateless[pid]['status'],
            'qwen_names':[m for m in qwen_mentions if m['paragraph_id'] == pid and m['kind'] == 'name'],
            'qwen_pronouns_descriptions':[m for m in qwen_mentions if m['paragraph_id'] == pid and m['kind'] != 'name'],
            'human_reference_mentions':None,'reviewed':False})
    write(ROOT/'review/ner-comparison.json', {**stamp,'same_english_source':True,
        'stateless_control_provenance':{k:v for k,v in control.items() if k != 'paragraphs'},
        'paragraphs':name_comparison})
    alignment = read(ROOT/'fixtures/events.json')['event_alignment']
    en_doc, ru_doc = [read(folder/'document.json') for folder in [english,russian]]
    en_evidence, ru_evidence = [rows(folder/'evidence.jsonl') for folder in [english,russian]]
    pairs = []
    for event in alignment:
        ep, rp = en_doc['paragraphs'][event['en_paragraph_ordinal']], ru_doc['paragraphs'][event['ru_paragraph_ordinal']]
        pairs.append({**event,'alignment_source':'manually_authored_test_pair_not_automatic_translation_alignment',
            'english':ep,'russian':rp,
            'qwen_en':[e for e in en_evidence if ep['id'] in e['paragraph_ids']],
            'qwen_ru':[e for e in ru_evidence if rp['id'] in e['paragraph_ids']], 'human_comparison':None})
    write(ROOT/'review/bilingual-events.json', {**stamp,'events':pairs})
    print(f'Prepared {len(name_comparison)} NER paragraphs and {len(pairs)} bilingual events for independent review')


if __name__ == '__main__':
    build()
