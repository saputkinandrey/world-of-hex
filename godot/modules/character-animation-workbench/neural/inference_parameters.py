"""Numerical options shared by ordinary workers and isolated experiments."""

DEFAULTS = {'seed':42,'steps':20,'resolution':512,'depth_resolution':512}


def parameters(request):
    values = {**DEFAULTS,**request.get('parameters',{})}
    if set(values) != set(DEFAULTS):
        raise ValueError('Unknown numerical inference parameter')
    if any(type(value) is not int for value in values.values()):
        raise ValueError('Numerical parameters must be integers')
    if not 0 <= values['seed'] < 2**32 or values['steps'] < 1:
        raise ValueError('Expected unsigned 32-bit seed and positive step count')
    if any(values[key] < 64 or values[key] % 64 for key in ('resolution','depth_resolution')):
        raise ValueError('Resolution must be a positive multiple of 64')
    return values
