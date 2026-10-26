"""Sequential, resumable extraction with provisional bounded prompt state."""
import copy
import json
import time
import traceback
from pathlib import Path

from common import ROOT, SCHEMA, code_hash, digest, fingerprint, provenance, read, write, write_rows, enforce_private_output
from grounding import normalize
from prompts import messages


def stamp(manifest):
    return {'schema_version': SCHEMA, 'model': manifest['model'],
            'checkpoint_revision': manifest['revision'], 'processing': manifest['processing'],
            'run_sha256': manifest['run_sha256']}


def prompt_state(registry, records, config):
    recent = records[-config['previous_paragraphs']:] if config['previous_paragraphs'] else []
    mentions = copy.deepcopy([m for r in recent for m in r.get('normalized', {}).get('mentions', [])])
    clarified = {p['record_id']: p['character_id'] for r in records
                 for p in r.get('normalized', {}).get('revision_proposals', [])}
    for mention in mentions:
        if mention['id'] in clarified:
            mention['character_id'] = clarified[mention['id']]
    return {'provisional': True,
            'characters': [{k: (c[k][-8:] if k == 'aliases' else c[k]) for k in ['id','name','aliases','status']}
                           for c in registry[-config['registry_limit']:]],
            'scene_participants': list(dict.fromkeys(m['character_id'] for m in mentions)),
            'recent_attributions': mentions[-8:],
            'revision_policy': 'proposals are reversible; raw responses remain immutable'}


def validate_saved(path, contract):
    record = read(path)
    saved_checksum = record.get('record_sha256')
    if saved_checksum is not None and saved_checksum != fingerprint({k:v for k,v in record.items() if k != 'record_sha256'}):
        raise ValueError(f'Completed record changed: {path}')
    if record['run_sha256'] != contract:
        raise ValueError(f'Run contract mismatch: {path}')
    for item in record['artifacts']:
        artifact = path.parent.parent / item['path']
        if not artifact.exists() or digest(artifact) != item['sha256']:
            raise ValueError(f'Completed artifact changed or missing: {artifact}')
    return record


def analyze(document_path, output, key, config, start=0, end=-1):
    from models import LocalModel
    document = read(document_path)
    enforce_private_output(output, document['source_kind'])
    if key == 'fable' and document['language'] != 'en':
        raise ValueError('FABLE comparison is English-only in v0.1.0')
    output = Path(output)
    output.mkdir(parents=True, exist_ok=True)
    paragraphs = document['paragraphs']
    if end == -1:
        end = len(paragraphs)
    if not 0 <= start < end <= len(paragraphs):
        raise ValueError('Range must satisfy 0 <= start < end <= paragraph count (end exclusive)')
    manifest = provenance(key, config)
    manifest.update({'document_sha256': digest(document_path), 'source_sha256': document['source_sha256'],
                     'language': document['language'], 'range': [start, end], 'code_sha256': code_hash()})
    manifest['run_sha256'] = fingerprint(manifest)
    manifest_path = output / 'run.json'
    if manifest_path.exists():
        old = read(manifest_path)
        if old != manifest:
            raise ValueError('Existing run differs in input/checkpoint/configuration/adapter; use a new output directory')
    else:
        write(manifest_path, manifest)
        write(output / 'document.json', document)
        snapshot = output / 'adapter-snapshot'
        snapshot.mkdir(exist_ok=True)
        for name in ['common.py','parsing.py','models.py','analysis.py','grounding.py','prompts.py']:
            (snapshot/name).write_bytes((ROOT/name).read_bytes())
    completed, pending = [], []
    for paragraph in paragraphs[start:end]:
        path = output / 'records' / f'{paragraph["ordinal"]:05d}.json'
        if path.exists():
            completed.append(validate_saved(path, manifest['run_sha256']))
        else:
            pending.append(paragraph['id'])
    if not pending:
        write(output / 'resume-check.json', {**stamp(manifest), 'skipped': len(completed), 'new_inferences': 0})
        print(f'{key}: skipped {len(completed)}, no model loaded')
        return
    model = LocalModel(key, config)
    load_path = output / 'model.json'
    if not load_path.exists():
        write(load_path, {**stamp(manifest), **model.metadata})
    records, registry = [], []
    for paragraph in paragraphs[start:end]:
        path = output / 'records' / f'{paragraph["ordinal"]:05d}.json'
        if path.exists():
            record = validate_saved(path, manifest['run_sha256'])
            registry = copy.deepcopy(record['registry_after'])
            records.append(record)
            continue
        n = paragraph['ordinal']
        previous = paragraphs[max(0, n-config['previous_paragraphs']):n]
        # Do not carry previous-section paragraphs as current-scene context.
        previous = [p for p in previous if p['section_id'] == paragraph['section_id']]
        raw_path = output / 'model_outputs' / key / f'{n:05d}.json'
        record = {**stamp(manifest), 'paragraph_id': paragraph['id'], 'ordinal': n,
                  'status': 'ERROR', 'normalized': {}, 'artifacts': []}
        try:
            if key == 'fable':
                if raw_path.exists():
                    raw = read(raw_path)
                    if raw['run_sha256'] != manifest['run_sha256']:
                        raise ValueError('Interrupted raw output has a different run contract')
                else:
                    raw = model.fable(paragraph)
                    raw.update(stamp(manifest))
                    write(raw_path, raw)
                record['normalized'] = {'entities': raw['entities']}
            else:
                supplied_state = prompt_state(registry, records, config)
                stage_results = {}
                if raw_path.exists():
                    interrupted = read(raw_path)
                    if interrupted['run_sha256'] != manifest['run_sha256']:
                        raise ValueError('Interrupted raw output has a different run contract')
                    stage_results = interrupted['stages']
                payload, stage_errors = {'mentions': [], 'observations': [], 'links': [], 'revisions': []}, []
                for stage in config['qwen_stages']:
                    try:
                        if stage in stage_results:
                            stage_result = stage_results[stage]
                        else:
                            stage_result = model.generate(messages(paragraph, previous, supplied_state, stage))
                            stage_results[stage] = stage_result
                            write(raw_path, {**stamp(manifest), 'stages': stage_results, 'state_supplied': supplied_state})
                        if stage_result['hit_output_cap']:
                            raise ValueError(f'{stage}: output token cap reached; partial response retained')
                        parsed = json.loads(stage_result['response'])
                        required = ['mentions'] if stage == 'mentions' else ['observations','links','revisions']
                        if not isinstance(parsed, dict) or any(not isinstance(parsed.get(k), list) for k in required):
                            raise ValueError(f'{stage}: required arrays absent')
                        payload.update({k: parsed[k] for k in required})
                        if stage == 'mentions':
                            # Give the behavior call only lexically grounded provisional identities.
                            provisional_registry = copy.deepcopy(registry)
                            normalize(payload, paragraph, previous, provisional_registry)
                            supplied_state = prompt_state(provisional_registry, records, config)
                    except Exception as error:
                        stage_errors.append({'stage': stage, 'type': type(error).__name__, 'message': str(error), 'traceback': traceback.format_exc()})
                record['normalized'] = normalize(payload, paragraph, previous, registry)
                if stage_errors:
                    record['stage_errors'] = stage_errors
                    record['status'] = 'PARTIAL' if stage_results else 'ERROR'
                    if not stage_results:
                        record['error'] = stage_errors[0]
                else:
                    record['status'] = 'SUCCESS'
            if key == 'fable':
                record['status'] = 'SUCCESS'
        except Exception as error:
            record['error'] = {'type': type(error).__name__, 'message': str(error), 'traceback': traceback.format_exc()}
            print(f'{key} {n}: {type(error).__name__}: {error}', flush=True)
        if raw_path.exists():
            record['artifacts'].append({'path': str(raw_path.relative_to(output)), 'sha256': digest(raw_path)})
        record['registry_after'] = copy.deepcopy(registry)
        record['record_sha256'] = fingerprint(record)
        write(path, record)
        records.append(record)
        rebuild(output, document, manifest, records, registry)
        print(f'{key} {n+1-start}/{end-start} {record["status"]}', flush=True)
    rebuild(output, document, manifest, records, registry)


def rebuild(output, document, manifest, records, registry):
    """Derived projections may be rebuilt; immutable per-paragraph results never change."""
    provenance_stamp = stamp(manifest)
    if manifest['model'] == 'fable':
        entities = [entity for r in records for entity in r['normalized'].get('entities', [])]
        write(output / 'characters.json', {**provenance_stamp, 'scope': 'mentions_only_not_coreference',
              'character_mentions': [e for e in entities if e['type'] == 'CHA'], 'all_entities': entities})
    else:
        write(output / 'characters.json', {**provenance_stamp, 'characters': registry,
            'ambiguous_mentions': [m for r in records for m in r['normalized'].get('mentions', []) if m['character_id'] in {'unknown','ambiguous'}]})
    by_id = {p['id']: p for p in document['paragraphs']}
    fragments, observations, mentions = [], [], []
    for r in records:
        pid = r['paragraph_id']
        normalized = r['normalized']
        links = normalized.get('links', [])
        merge = (fragments and r['status'] == 'SUCCESS' and fragments[-1]['status'] == 'SUCCESS'
                 and any(link['same_episode'] and link['relation'] != 'scene_change'
                         and link['paragraph_id'] == fragments[-1]['paragraph_ids'][-1] for link in links))
        if merge:
            fragment = fragments[-1]
            fragment['paragraph_ids'].append(pid)
        else:
            fragment = {**provenance_stamp, 'id': f'fragment-{pid}', 'paragraph_ids': [pid],
                        'status': r['status'], 'participants': [], 'semantic_links': [], 'annotation_status': 'automatic_unverified'}
            fragments.append(fragment)
        fragment['semantic_links'].extend(links)
        people = [m['character_id'] for m in normalized.get('mentions', [])]
        fragment['participants'] = list(dict.fromkeys([*fragment['participants'], *people]))
        kinds = {by_id[i]['type'] for i in fragment['paragraph_ids']}
        fragment['type'] = next(iter(kinds)) if len(kinds) == 1 else 'mixed'
        for obs in normalized.get('observations', []):
            observations.append({**provenance_stamp, **obs, 'fragment_id': fragment['id'],
                                 'paragraph_ids': list(dict.fromkeys(ref['paragraph_id'] for ref in obs['evidence']))})
        mentions.extend({**provenance_stamp, **m} for m in normalized.get('mentions', []))
    history = []
    lookup = {item['id']: item for item in [*mentions, *observations]}
    for record in records:
        for proposal in record['normalized'].get('revision_proposals', []):
            target = lookup.get(proposal['record_id'])
            target_pid = (target.get('paragraph_id') or target.get('paragraph_ids', [''])[0]) if target else ''
            if target is None or target_pid >= record['paragraph_id']:
                history.append({**provenance_stamp, **proposal, 'applied': False, 'error': 'Unknown or non-prior record'})
                continue
            before = target['character_id']
            target['character_id'] = proposal['character_id']
            history.append({**provenance_stamp, **proposal, 'applied': True, 'before': before,
                            'after': proposal['character_id'], 'clarified_by': record['paragraph_id']})
    write_rows(output / 'fragments.jsonl', fragments)
    write_rows(output / 'evidence.jsonl', observations)
    write_rows(output / 'mentions.jsonl', mentions)
    write_rows(output / 'revision-history.jsonl', history)
    write(output / 'progress.json', {**provenance_stamp, 'processed': len(records),
          'successful': sum(r['status'] == 'SUCCESS' for r in records),
          'partial': sum(r['status'] == 'PARTIAL' for r in records),
          'errors': [{'paragraph_id': r['paragraph_id'], **r['error']} for r in records if r['status'] == 'ERROR']})
