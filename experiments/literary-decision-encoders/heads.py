"""Independent scalar compatibility heads on frozen candidate features."""
from pathlib import Path

import torch
from torch import nn

from contracts import digest
from encoders import fingerprint

HEAD_SCHEMA = 'literary-head/1'


class ScoringHead(nn.Module):
    def __init__(self, input_size, hidden_size):
        super().__init__()
        self.layers = nn.Sequential(nn.Linear(input_size, hidden_size), nn.Tanh(), nn.Linear(hidden_size, 1))

    def forward(self, features):
        return self.layers(features).squeeze(-1)


def train_head(head, features, cases, steps):
    if steps < 1:
        raise ValueError('Training steps must be positive')
    optimizer = torch.optim.AdamW(head.parameters(), lr=0.003)
    losses = []
    head.train()
    for step in range(steps):
        index = step % len(cases)
        case = cases[index]
        target = [a['id'] for a in case['actions']].index(case['chosen_action_id'])
        scores = head(features[index])
        loss = nn.functional.cross_entropy(scores.unsqueeze(0), torch.tensor([target], device=scores.device))
        if not torch.isfinite(loss):
            raise ValueError('Nonfinite training loss')
        optimizer.zero_grad(set_to_none=True)
        loss.backward()
        optimizer.step()
        losses.append(loss.item())
    head.eval()
    return losses


def save_head(path, head, encoder, hidden_size, dataset, steps):
    if Path(path).exists():
        raise FileExistsError(path)
    torch.save({'schema': HEAD_SCHEMA, 'state': head.state_dict(), 'input_size': encoder.hidden_size,
                'hidden_size': hidden_size, 'model': encoder.key, 'revision': encoder.spec['revision'],
                'encoder_sha256': fingerprint(encoder.model), 'pooling': 'masked-mean/1',
                'serialization': 'candidate-text/1', 'training_steps': steps,
                'dataset_sha256': digest(dataset), 'synthetic': dataset.get('synthetic', False)}, path)


def load_head(path, encoder):
    data = torch.load(path, map_location=encoder.device, weights_only=True)
    if (data['schema'] != HEAD_SCHEMA or data['model'] != encoder.key or
            data['revision'] != encoder.spec['revision'] or data['input_size'] != encoder.hidden_size or
            data['pooling'] != 'masked-mean/1' or data['serialization'] != 'candidate-text/1' or
            data['training_steps'] < 1 or data['encoder_sha256'] != fingerprint(encoder.model)):
        raise ValueError('Head does not match encoder, representation or training contract')
    head = ScoringHead(data['input_size'], data['hidden_size']).to(encoder.device)
    head.load_state_dict(data['state'])
    head.eval()
    return head, data


def score(head, features, case):
    with torch.no_grad():
        values = head(features)
    if not torch.isfinite(values).all():
        raise ValueError('Nonfinite action scores')
    ids = [action['id'] for action in case['actions']]
    return {'scores': dict(zip(ids, values.cpu().tolist())), 'selected_action_id': ids[values.argmax().item()]}
