"""Shared JSON contract and stable action identity, independent of any model."""
import hashlib
import json
import math


def digest(value):
    return hashlib.sha256(json.dumps(value,ensure_ascii=False,separators=(',',':')).encode()).hexdigest()


def validate_case(case):
    for key in ('character','situation','actions'):
        if key not in case:
            raise ValueError('Missing input field: '+key)
    if not isinstance(case['character'],dict) or not isinstance(case['situation'],dict):
        raise ValueError('character and situation must be JSON objects')
    actions = case['actions']
    if not isinstance(actions,list) or not 2 <= len(actions) <= 24:
        raise ValueError('Expected2..24 allowed actions')
    ids = [a['id'] for a in actions]
    if len(ids)!=len(set(ids)) or any(not isinstance(a['id'],str) or not a['id'] or not isinstance(a['description'],str) or not a['description'] for a in actions):
        raise ValueError('Actions require unique nonempty string IDs and descriptions')
    if '__insufficient_evidence__' in ids:
        raise ValueError('Reserved abstention ID cannot be used as an action')
    return case


def state_text(case):
    return json.dumps({key:case[key] for key in ('character','situation')},ensure_ascii=False,separators=(',',':'))


def validate_prediction(answer,allowed):
    probabilities = answer['probabilities']
    if not probabilities or any(key not in set(allowed)|{'__insufficient_evidence__'} for key in probabilities):
        raise ValueError('Unexpected action in model distribution')
    if any(not math.isfinite(value) or not 0<=value<=1 for value in probabilities.values()) or abs(sum(probabilities.values())-1)>.001:
        raise ValueError('Invalid probability distribution')
    selected = answer['selected_action']
    if selected is None:
        if not answer['abstained']:
            raise ValueError('Missing action without an explicit abstention')
    elif selected not in allowed:
        raise ValueError('Model selected an action outside the allowed schema')


def question(case):
    return ('Какое из допустимых действий наиболее соответствует этому персонажу в описанной ситуации?'
            if case.get('language')=='ru' else
            'Which allowed action best fits this character in this situation?')


def load_cases(path):
    with open(path,encoding='utf-8') as stream:
        data = json.load(stream)
    cases = data['cases'] if 'cases' in data else [data]
    if not cases:
        raise ValueError('Empty test suite')
    for index,case in enumerate(cases):
        case.setdefault('id',f'case-{index+1:03d}')
        validate_case(case)
    if len({case['id'] for case in cases})!=len(cases):
        raise ValueError('Case IDs must be unique')
    return cases
