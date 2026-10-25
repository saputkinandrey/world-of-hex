"""One text per candidate; action IDs never enter the encoder input."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def read_json(path):
    return json.loads(Path(path).read_text(encoding='utf-8-sig'))


def write_json(path, value):
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    Path(path).write_text(json.dumps(value, ensure_ascii=False, indent=2, allow_nan=False)+'\n', encoding='utf-8')


def digest(value):
    return hashlib.sha256(json.dumps(value, ensure_ascii=False, sort_keys=True).encode()).hexdigest()


def validate(case, labeled=False):
    for section, fields in [('character', ['biography', 'motivation']), ('situation', ['description'])]:
        for field in fields:
            if not isinstance(case[section][field], str) or not case[section][field].strip():
                raise ValueError(f'{section}.{field} must be nonempty text')
    if 'available_information' in case and not isinstance(case['available_information'], str):
        raise ValueError('available_information must be text')
    actions = case['actions']
    if not isinstance(actions, list) or len(actions) < 2:
        raise ValueError('At least two allowed actions required')
    for action in actions:
        if any(not isinstance(action[key], str) or not action[key].strip() for key in ['id', 'description']):
            raise ValueError('Action IDs and descriptions must be nonempty strings')
    ids = [action['id'] for action in actions]
    if len(set(ids)) != len(ids):
        raise ValueError('Duplicate action IDs')
    if labeled:
        if 'available_information' not in case:
            raise ValueError('Labeled decisions require explicit available_information')
        if case.get('chosen_action_id') not in ids:
            raise ValueError('chosen_action_id must identify an allowed action')
    return case


def candidate_texts(case):
    validate(case)
    state = (f"Biography: {case['character']['biography']}\n"
             f"Motivation: {case['character']['motivation']}\n"
             f"Known information: {case.get('available_information', '')}\n"
             f"Situation: {case['situation']['description']}\nAction: ")
    return [state + action['description'] for action in case['actions']]


def load_dataset(path, labeled=False):
    data = read_json(path)
    cases = data['cases'] if 'cases' in data else [data]
    if not cases:
        raise ValueError('Empty dataset')
    for case in cases:
        validate(case, labeled)
    return data, cases
