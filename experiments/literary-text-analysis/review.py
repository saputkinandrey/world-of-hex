"""Editable JSON review packets and append-only human revision history."""
import copy
import datetime
from pathlib import Path

from common import CATEGORIES, SCHEMA, fingerprint, read, rows, write, enforce_private_output
from grounding import anchor


def export_review(run, output):
    run, output = Path(run), Path(output)
    if output.exists():
        raise FileExistsError(output)
    manifest, document = read(run/'run.json'), read(run/'document.json')
    enforce_private_output(output, document['source_kind'])
    fragments = rows(run/'fragments.jsonl')
    evidence = rows(run/'evidence.jsonl')
    mentions = rows(run/'mentions.jsonl')
    paragraph_map = {p['id']: p for p in document['paragraphs']}
    packet = {'schema_version': SCHEMA, 'model': manifest['model'], 'checkpoint_revision': manifest['revision'],
              'processing': manifest['processing'], 'run_sha256': manifest['run_sha256'],
              'annotation_status': 'unreviewed', 'reviewer': '', 'independent_gold': False,
              'instructions': 'Edit corrected fields, add missing records, remove incorrect ones. Set each task reviewed=true and supply reviewer. Quotes must match source; JSON import preserves model outputs. This packet is not independent gold.',
              'tasks': []}
    for fragment in fragments[:50]:
        pids = fragment['paragraph_ids']
        selected_evidence = [e for e in evidence if e['fragment_id'] == fragment['id']]
        selected_mentions = [m for m in mentions if m['paragraph_id'] in pids]
        initial = {'fragments': [fragment], 'mentions': selected_mentions, 'evidence': selected_evidence,
                   'speakers': [], 'characters': read(run/'characters.json')}
        packet['tasks'].append({'id': fragment['id'], 'reviewed': False,
            'source_paragraphs': [paragraph_map[p] for p in pids], 'model_annotation': initial,
            'corrected': copy.deepcopy(initial), 'notes': ''})
    write(output, packet)
    template = output.with_suffix('.md')
    template.write_text('# Manual review\n\nEdit the adjacent JSON packet; original outputs remain separate.\n\n'
                        'Use `review-import` after checking exact quotes, identities, speakers, fragment boundaries and missing/incorrect observations. '
                        'Set `reviewed` per task, enter your reviewer name, and explain changes in `notes`.\n\n'
                        'A model-prefilled review packet is not an independent evaluation gold set.\n', encoding='utf-8')
    print(f'Exported {len(packet["tasks"])} review tasks: {output}')


def validate_correction(corrected, paragraphs):
    if any(not isinstance(corrected.get(key), list) for key in ['fragments','mentions','evidence','speakers']):
        raise ValueError('Corrected fragments/mentions/evidence/speakers must be arrays')
    characters = corrected.get('characters', {}).get('characters', [])
    known_characters = {c['id'] for c in characters} | {'unknown','ambiguous','narrator'}
    fragment_ids = {f['id'] for f in corrected['fragments']}
    for fragment in corrected['fragments']:
        if not fragment['paragraph_ids'] or any(pid not in paragraphs for pid in fragment['paragraph_ids']):
            raise ValueError('Corrected fragment references unknown paragraphs')
    for mention in corrected['mentions']:
        if mention.get('character_id', 'unknown') not in known_characters:
            raise ValueError('Corrected mention references unknown character ID')
        ref = anchor({**mention, 'quote': mention.get('quote', mention.get('text')),
                      **({'occurrence': mention['occurrence']} if 'occurrence' in mention else {})}, paragraphs)
        if 'start' in mention and (mention['start'], mention['end']) != (ref['start'], ref['end']):
            raise ValueError('Corrected mention offsets do not match quote')
    for item in [*corrected['evidence'], *corrected['speakers']]:
        if not item.get('evidence'):
            raise ValueError('Human evidence/speaker correction must have source anchors')
        for ref in item['evidence']:
            anchor(ref, paragraphs)
    for item in corrected['evidence']:
        if not item.get('categories') or any(c not in CATEGORIES for c in item['categories']):
            raise ValueError('Corrected evidence uses unsupported behavior categories')
        if item.get('character_id') not in known_characters or item.get('fragment_id') not in fragment_ids:
            raise ValueError('Corrected evidence references unknown character/fragment ID')
        for value in item.get('participants', {}).values():
            if isinstance(value, str) and value not in known_characters:
                raise ValueError('Corrected evidence participant is unknown')
            if isinstance(value, dict):
                if value.get('kind') != 'textual_object':
                    raise ValueError('Unsupported corrected participant object')
                anchor(value, paragraphs)
            elif not isinstance(value, str):
                raise ValueError('Corrected participant must be character ID or anchored textual object')
    for item in corrected['speakers']:
        if item.get('character_id') not in known_characters:
            raise ValueError('Corrected speaker references unknown character ID')


def import_review(run, review_path):
    run = Path(run)
    packet, manifest = read(review_path), read(run/'run.json')
    if packet['run_sha256'] != manifest['run_sha256']:
        raise ValueError('Review belongs to a different run')
    if not packet.get('reviewer', '').strip():
        raise ValueError('Human reviewer name required')
    paragraphs = {p['id']: p for p in read(run/'document.json')['paragraphs']}
    selected = [t for t in packet['tasks'] if t.get('reviewed') is True]
    if not selected:
        raise ValueError('No tasks explicitly marked reviewed')
    for task in selected:
        validate_correction(task['corrected'], paragraphs)
    record = {'schema_version': SCHEMA, 'model': manifest['model'], 'checkpoint_revision': manifest['revision'],
              'processing': manifest['processing'], 'run_sha256': manifest['run_sha256'],
              'annotation_status': 'human_reviewed', 'reviewer': packet['reviewer'],
              'independent_gold': False, 'origin': 'review_of_model_prefill_not_blind_gold',
              'review_sha256': fingerprint(packet), 'tasks': selected,
              'timestamp_utc': datetime.datetime.now(datetime.timezone.utc).isoformat()}
    path = run/'review/history'/f'{record["review_sha256"]}.json'
    if path.exists():
        raise FileExistsError('This exact review was already imported')
    write(path, record)
    print(f'Imported {len(selected)} human-reviewed tasks; original model outputs unchanged')
