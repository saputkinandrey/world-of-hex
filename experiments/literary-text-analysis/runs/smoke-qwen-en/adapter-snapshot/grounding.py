"""Validate exact source anchors; lexical grounding does not prove interpretation."""
import copy
import re

from common import CATEGORIES

UNKNOWN = {'unknown', 'ambiguous'}


def anchor(item, paragraphs):
    pid, quote = item.get('paragraph_id'), item.get('quote')
    if pid not in paragraphs or not isinstance(quote, str) or not quote:
        raise ValueError('Missing/unknown paragraph or empty quote')
    text = paragraphs[pid]['text']
    starts = [m.start() for m in re.finditer(re.escape(quote), text)]
    occurrence = item.get('occurrence')
    if occurrence is None:
        if len(starts) != 1:
            raise ValueError(f'Quote has {len(starts)} occurrences; supply occurrence: {quote!r}')
        occurrence = 0
    if not isinstance(occurrence, int) or occurrence < 0 or occurrence >= len(starts):
        raise ValueError(f'Invalid occurrence for quote: {quote!r}')
    start = starts[occurrence]
    return {'paragraph_id': pid, 'start': start, 'end': start + len(quote), 'quote': quote}


def character(name, registry, target_text, allow_new=False):
    if not isinstance(name, str) or not name.strip():
        raise ValueError('Character identity must be a nonempty string')
    name = name.strip()
    if name in UNKNOWN or name == 'narrator':
        return name
    match = next((c for c in registry if c['name'].casefold() == name.casefold()), None)
    if match:
        return match['id']
    if not allow_new or name not in target_text:
        raise ValueError(f'Unestablished character name absent from target: {name}')
    cid = f'c{len(registry) + 1:04d}'
    registry.append({'id': cid, 'name': name, 'aliases': [], 'mentions': [], 'status': 'automatic_unverified'})
    return cid


def normalize(payload, target, previous, registry):
    if not isinstance(payload, dict) or any(not isinstance(payload.get(key), list) for key in ['mentions','observations','links','revisions']):
        raise ValueError('Expected mentions, observations, links and revisions arrays')
    paragraphs = {p['id']: p for p in [*previous, target]}
    result = {'mentions': [], 'observations': [], 'links': [], 'revision_proposals': [], 'rejected': []}
    pid = target['id']
    for index, mention in enumerate(payload['mentions']):
        snapshot = copy.deepcopy(registry)
        try:
            ref = anchor({**mention, 'paragraph_id': pid}, paragraphs)
            if mention['kind'] not in {'name','pronoun','description'} or mention['role'] not in {'actor','target','speaker','about','unknown'}:
                raise ValueError('Unsupported mention kind/role')
            cid = character(mention['who'], registry, target['text'], allow_new=True)
            mid = f'{pid}:m{index:03d}'
            item = {'id': mid, **ref, 'text': ref['quote'], 'character_id': cid,
                    'kind': mention['kind'], 'role': mention['role'], 'status': 'automatic_unverified'}
            result['mentions'].append(item)
            if cid not in UNKNOWN and cid != 'narrator':
                record = next(c for c in registry if c['id'] == cid)
                record['mentions'].append(mid)
                if mention['kind'] in {'name','description'} and ref['quote'] not in record['aliases']:
                    record['aliases'].append(ref['quote'])
        except (KeyError, TypeError, ValueError) as error:
            registry[:] = snapshot
            result['rejected'].append({'kind': 'mention', 'index': index, 'error': str(error), 'original': mention})
    for index, observation in enumerate(payload['observations']):
        try:
            refs = [anchor(ref, paragraphs) for ref in observation['evidence']]
            if not refs or not any(r['paragraph_id'] == pid for r in refs):
                raise ValueError('Observation must have target-paragraph evidence')
            categories = observation['categories']
            if not categories or not isinstance(categories, list) or any(c not in CATEGORIES for c in categories):
                raise ValueError('Unsupported behavior category')
            if observation['source'] not in {'narrator','self_report','other_report','unknown'} or observation['status'] not in {'asserted','reported','denied','planned','ambiguous'}:
                raise ValueError('Unsupported assertion source/status')
            if not isinstance(observation['summary'], str) or not observation['summary'].strip():
                raise ValueError('Empty observation summary')
            identities = {key: character(observation[key], registry, target['text']) for key in ['who','actor','target','speaker','about']}
            result['observations'].append({'id': f'{pid}:e{index:03d}', 'character_id': identities.pop('who'),
                'participants': identities, 'categories': categories, 'summary': observation['summary'],
                'evidence': refs, 'assertion_source': observation['source'], 'assertion_status': observation['status'],
                'certainty': 'model_unverified', 'status': 'automatic_unverified'})
        except (KeyError, TypeError, ValueError) as error:
            result['rejected'].append({'kind': 'observation', 'index': index, 'error': str(error), 'original': observation})
    for index, link in enumerate(payload['links']):
        try:
            if link['paragraph_id'] not in {p['id'] for p in previous}:
                raise ValueError('Link must reference supplied previous context')
            ref = anchor({'paragraph_id': pid, 'quote': link['quote'], **({'occurrence': link['occurrence']} if 'occurrence' in link else {})}, paragraphs)
            if link['relation'] not in {'question_answer','offer_response','objection','same_topic','narrative_dependency','scene_change'} or not isinstance(link['same_episode'], bool):
                raise ValueError('Unsupported semantic relation')
            result['links'].append({**link, 'evidence': ref, 'status': 'automatic_unverified'})
        except (KeyError, TypeError, ValueError) as error:
            result['rejected'].append({'kind': 'link', 'index': index, 'error': str(error), 'original': link})
    for index, proposal in enumerate(payload['revisions']):
        try:
            refs = [anchor(ref, paragraphs) for ref in proposal['evidence']]
            if not refs or not any(r['paragraph_id'] == pid for r in refs):
                raise ValueError('Revision must cite current target')
            cid = character(proposal['character'], registry, target['text'])
            if cid in UNKNOWN or cid == 'narrator':
                raise ValueError('Revision must identify known character')
            result['revision_proposals'].append({'record_id': proposal['record_id'], 'character_id': cid,
                'reason': proposal['reason'], 'evidence': refs, 'status': 'automatic_unverified'})
        except (KeyError, TypeError, ValueError) as error:
            result['rejected'].append({'kind': 'revision', 'index': index, 'error': str(error), 'original': proposal})
    return result
