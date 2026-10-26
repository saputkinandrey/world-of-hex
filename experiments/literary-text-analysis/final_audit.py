"""Check stored references and preservation, never infer semantic truth."""
import json
import re
from pathlib import Path

from common import ROOT, SCHEMA, digest, fingerprint, read, rows, write
from grounding import anchor


def audit():
    summaries = []
    for name in ['final-fable-en','final-qwen-en','final-qwen-ru']:
        folder = ROOT/'runs'/name
        manifest, document = read(folder/'run.json'), read(folder/'document.json')
        by_id = {p['id']:p for p in document['paragraphs']}
        assert digest(document['source']) == document['source_sha256']
        records = [read(p) for p in sorted((folder/'records').glob('*.json'))]
        assert len(records) == 32
        for record in records:
            assert record['run_sha256'] == manifest['run_sha256']
            assert record['record_sha256'] == fingerprint({k:v for k,v in record.items() if k != 'record_sha256'})
            for artifact in record['artifacts']:
                assert digest(folder/artifact['path']) == artifact['sha256']
        fragments = rows(folder/'fragments.jsonl')
        assert [pid for f in fragments for pid in f['paragraph_ids']] == [p['id'] for p in document['paragraphs']]
        for mention in rows(folder/'mentions.jsonl'):
            anchor(mention, by_id)
        for evidence in rows(folder/'evidence.jsonl'):
            for reference in evidence['evidence']:
                anchor(reference, by_id)
        if manifest['model'] == 'fable':
            for entity in read(folder/'characters.json')['all_entities']:
                assert by_id[entity['paragraph_id']]['text'][entity['start']:entity['end']] == entity['text']
        else:
            people = read(folder/'characters.json')
            mentions = rows(folder/'mentions.jsonl')
            assert people['ambiguous_mentions'] == [m for m in mentions if m['character_id'] in {'unknown','ambiguous'}]
            for person in people['characters']:
                assert person['mentions'] == [m['id'] for m in mentions if m['character_id'] == person['id']]
        probe = read(ROOT/f'provenance/probe-{manifest["model"]}.json')
        assert manifest['checkpoint_files'] == probe['checkpoint_files']
        checkpoint = Path(manifest['local_path'])
        for relative, expected in manifest['checkpoint_files'].items():
            assert digest(checkpoint/relative) == expected
        summaries.append({'run':name,'records':len(records),'fragments':len(fragments),
                          'artifacts_and_anchors_valid':True,'checkpoint_unchanged':True})
    links = []
    for name in ['REPORT.md']:
        for target in re.findall(r'\]\(([^)]+)\)', (ROOT/name).read_text(encoding='utf-8')):
            if '://' not in target:
                target = target.strip('<>')
                assert (ROOT/target).exists(), target
                links.append(target)
    write(ROOT/'verification.json', {'schema_version':SCHEMA,'model':'per_run','checkpoint_revision':'see_run_manifests',
          'processing':'checksums, references, exact source anchors and partition invariants only',
          'runs':summaries,'local_report_links_checked':len(links),'semantic_quality_certified':False})
    print(json.dumps({'runs_verified':len(summaries),'report_links':len(links)}))


if __name__ == '__main__':
    audit()
