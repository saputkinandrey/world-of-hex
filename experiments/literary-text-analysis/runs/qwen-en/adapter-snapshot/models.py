"""Published, frozen local checkpoints. No random head or CPU fallback."""
import importlib.metadata
import threading
import time

import psutil
import torch
from transformers import AutoModelForCausalLM, AutoModelForTokenClassification, AutoTokenizer

from common import resolve_model


class ContextOverflow(ValueError):
    pass


class Measurement:
    def __enter__(self):
        self.started = time.perf_counter()
        self.rss = psutil.Process().memory_info().rss
        self.stop = threading.Event()
        torch.cuda.synchronize()
        torch.cuda.reset_peak_memory_stats()
        self.thread = threading.Thread(target=self.sample, daemon=True)
        self.thread.start()
        return self

    def sample(self):
        while not self.stop.wait(0.02):
            self.rss = max(self.rss, psutil.Process().memory_info().rss)

    def __exit__(self, *exception):
        torch.cuda.synchronize()
        self.stop.set()
        self.thread.join()
        self.rss = max(self.rss, psutil.Process().memory_info().rss)
        self.result = {'seconds': time.perf_counter() - self.started, 'rss_peak_bytes': self.rss,
                       'cuda_peak_allocated_bytes': torch.cuda.max_memory_allocated(),
                       'cuda_peak_reserved_bytes': torch.cuda.max_memory_reserved(),
                       'rss_sampling_seconds': 0.02}


class LocalModel:
    def __init__(self, key, config):
        if not torch.cuda.is_available():
            raise RuntimeError('CUDA is required for this experiment; no implicit CPU fallback')
        torch.manual_seed(config['seed'])
        torch.cuda.manual_seed_all(config['seed'])
        self.key, self.config = key, config
        path = resolve_model(key, config)
        with Measurement() as meter:
            self.tokenizer = AutoTokenizer.from_pretrained(path, local_files_only=True, trust_remote_code=False)
            loader = AutoModelForTokenClassification if key == 'fable' else AutoModelForCausalLM
            dtype = torch.float32 if key == 'fable' else torch.bfloat16
            options = {'attn_implementation': 'sdpa'} if key == 'qwen' else {}
            self.model, loading = loader.from_pretrained(path, local_files_only=True, trust_remote_code=False,
                dtype=dtype, output_loading_info=True, **options)
            if any(loading.get(k) for k in ['missing_keys', 'mismatched_keys', 'error_msgs', 'unexpected_keys']):
                raise ValueError(f'Checkpoint was not loaded exactly: {loading}')
            self.model.to('cuda').eval().requires_grad_(False)
        loading = {key: sorted(value) if isinstance(value, set) else value for key, value in loading.items()}
        self.metadata = {'architecture': type(self.model).__name__, 'dtype': str(dtype),
                         'loading_info': loading, 'load_measurement': meter.result,
                         'versions': {name: importlib.metadata.version(name) for name in ['torch', 'transformers', 'tokenizers', 'psutil']},
                         'device': torch.cuda.get_device_name(0), 'frozen': True,
                         'architecture_context': self.model.config.max_position_embeddings}
        if key == 'fable':
            if self.model.config.id2label.get(1) != 'B-CHA' or self.model.classifier.out_features != 15:
                raise ValueError('Expected original 15-label FABLE NER head')
            self.metadata['id2label'] = self.model.config.id2label
            self.metadata['trained_head_verified_no_missing_keys'] = True
        else:
            self.model.generation_config.do_sample = False
            self.model.generation_config.temperature = None
            self.model.generation_config.top_p = None
            self.model.generation_config.top_k = None

    def fable(self, paragraph):
        text = paragraph['text']
        limit = min(512, self.model.config.max_position_embeddings, self.tokenizer.model_max_length)
        encoded = self.tokenizer(text, max_length=limit, stride=self.config['fable_overlap_tokens'],
                                 truncation=True, return_overflowing_tokens=True, return_offsets_mapping=True)
        offsets = encoded.pop('offset_mapping')
        encoded.pop('overflow_to_sample_mapping')
        windows, choices = [], {}
        with Measurement() as meter:
            for index, coordinates in enumerate(offsets):
                data = {key: torch.tensor([value[index]], device='cuda') for key, value in encoded.items()}
                with torch.inference_mode():
                    probabilities = self.model(**data).logits[0].float().softmax(-1)
                scores, labels = probabilities.max(-1)
                scores, labels = scores.cpu().tolist(), labels.cpu().tolist()
                tokens = []
                for pos, ((start, end), label, score) in enumerate(zip(coordinates, labels, scores)):
                    if end <= start:
                        continue
                    item = {'start': start, 'end': end, 'label': self.model.config.id2label[label], 'score': score,
                            'token_id': int(data['input_ids'][0, pos]), 'window': index}
                    tokens.append(item)
                    # Prefer a token with more context at both sides; exact offsets deduplicate overlap.
                    centrality = min(pos, len(coordinates) - pos - 1)
                    old = choices.get((start, end))
                    if old is None or centrality > old[0]:
                        choices[(start, end)] = (centrality, item)
                windows.append({'index': index, 'input_tokens': len(coordinates), 'tokens': tokens})
        entities, current = [], None
        for _, token in sorted(choices.values(), key=lambda item: (item[1]['start'], item[1]['end'])):
            label = token['label']
            if label == 'O':
                current = None
                continue
            prefix, kind = label.split('-', 1)
            if prefix == 'B' or current is None or current['type'] != kind or text[current['end']:token['start']].strip():
                current = {'paragraph_id': paragraph['id'], 'start': token['start'], 'end': token['end'],
                           'type': kind, 'scores': [token['score']]}
                entities.append(current)
            else:
                current['end'] = max(current['end'], token['end'])
                current['scores'].append(token['score'])
        for entity in entities:
            entity['text'] = text[entity['start']:entity['end']]
            # Mean token confidence, not calibrated span probability.
            scores = entity.pop('scores')
            entity['score'] = sum(scores) / len(scores)
        return {'entities': entities, 'windows': windows, 'measurement': meter.result,
                'input_tokens': sum(w['input_tokens'] for w in windows), 'output_tokens': 0}

    def generate(self, messages):
        prompt = self.tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True,
                                                   enable_thinking=False)
        inputs = self.tokenizer(prompt, add_special_tokens=False, truncation=False, return_tensors='pt')
        count = inputs['input_ids'].shape[1]
        output_cap = self.config['generation']['max_new_tokens']
        if count > self.config['context_tokens'] or count + output_cap > self.model.config.max_position_embeddings:
            raise ContextOverflow(f'Input {count} + output {output_cap}; working input cap {self.config["context_tokens"]}')
        inputs = inputs.to('cuda')
        options = {k: v for k, v in self.config['generation'].items() if k != 'enable_thinking'}
        with Measurement() as meter, torch.inference_mode():
            output = self.model.generate(**inputs, **options)
        generated = output[0, count:].cpu().tolist()
        return {'response': self.tokenizer.decode(generated, skip_special_tokens=True),
                'input_tokens': count, 'output_tokens': len(generated), 'output_token_ids': generated,
                'hit_output_cap': len(generated) >= output_cap and generated[-1] != self.tokenizer.eos_token_id,
                'prompt': prompt, 'measurement': meter.result}
