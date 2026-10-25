"""Official checkpoint loaders only. No base-model substitution or truncation."""
import hashlib

import torch
from sentence_transformers import SentenceTransformer
from transformers import AutoModel, AutoTokenizer

from contracts import ROOT, candidate_texts, read_json


class ContextOverflow(ValueError):
    pass


def fingerprint(module):
    result = hashlib.sha256()
    for name, tensor in module.state_dict().items():
        result.update(name.encode())
        result.update(tensor.detach().cpu().contiguous().numpy().tobytes())
    return result.hexdigest()


class Encoder:
    def __init__(self, key, device):
        config = read_json(ROOT / 'config.json')
        self.spec = config['models'][key]
        self.key = key
        self.device = device
        path = ROOT / 'model-paths.json'
        receipt = read_json(path)[key]
        if receipt['revision'] != self.spec['revision'] or receipt['repo'] != self.spec['repo']:
            raise ValueError('Download receipt does not match pinned checkpoint')
        path = receipt['path']
        self.sentence_model = None
        if key == 'literary_minilm':
            self.sentence_model = SentenceTransformer(path, device=device, local_files_only=True, trust_remote_code=False)
            self.model = self.sentence_model[0].auto_model
            self.tokenizer = self.sentence_model.tokenizer
            limits = [self.sentence_model.max_seq_length, self.spec['context_cap']]
            self.loading = {'loader': 'SentenceTransformer', 'native_max_seq_length': self.sentence_model.max_seq_length}
        else:
            self.tokenizer = AutoTokenizer.from_pretrained(path, local_files_only=True, trust_remote_code=False)
            self.model, self.loading = AutoModel.from_pretrained(path, local_files_only=True, trust_remote_code=False, output_loading_info=True)
            # NER / discriminator keys may be unused. Missing encoder weights are forbidden.
            if self.loading.get('missing_keys') or self.loading.get('mismatched_keys') or self.loading.get('error_msgs'):
                raise ValueError(f'Incomplete encoder checkpoint: {self.loading}')
            self.loading = {key: sorted(value) if isinstance(value, set) else value for key, value in self.loading.items()}
            self.model.to(device)
            limits = []
        limits.append(self.model.config.max_position_embeddings)
        if self.tokenizer.model_max_length < 1_000_000:
            limits.append(self.tokenizer.model_max_length)
        self.max_length = min(limits)
        self.model.requires_grad_(False)
        self.model.eval()
        if self.sentence_model is not None:
            self.sentence_model.requires_grad_(False)
            self.sentence_model.eval()
        self.hidden_size = self.model.config.hidden_size

    def tokenize(self, texts):
        tokens = self.tokenizer(texts, padding=False, truncation=False)
        lengths = [len(row) for row in tokens['input_ids']]
        if max(lengths) > self.max_length:
            raise ContextOverflow(f'Input lengths {lengths} exceed context {self.max_length}; truncation disabled')
        batch = self.tokenizer.pad(tokens, padding=True, return_tensors='pt')
        return {key: value.to(self.device) for key, value in batch.items()}, lengths

    def represent(self, case):
        tokens, lengths = self.tokenize(candidate_texts(case))
        with torch.no_grad():
            hidden = self.model(**tokens).last_hidden_state
            mask = tokens['attention_mask'].unsqueeze(-1)
            pooled = (hidden * mask).sum(1) / mask.sum(1)
        if not torch.isfinite(hidden).all() or not torch.isfinite(pooled).all():
            raise ValueError('Nonfinite encoder output')
        return pooled, {'tokens_per_action': lengths, 'hidden_shape': list(hidden.shape), 'pooled_shape': list(pooled.shape)}

    def metadata(self):
        return {'repo': self.spec['repo'], 'revision': self.spec['revision'],
                'architecture': type(self.model).__name__, 'parameters': sum(p.numel() for p in self.model.parameters()),
                'max_length': self.max_length, 'architectural_context': self.model.config.max_position_embeddings,
                'hidden_size': self.hidden_size, 'languages_claimed': self.spec['languages'],
                'loading_info': self.loading, 'frozen': all(not p.requires_grad for p in self.model.parameters())}
