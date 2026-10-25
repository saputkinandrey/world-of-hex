"""Local experiment CLI; sequential fresh workers keep GPU models isolated."""
import argparse
import copy
import importlib.metadata
import json
import os
from pathlib import Path
import platform
import subprocess
import sys
import traceback

os.environ['USE_TF'] = '0'

from contracts import ROOT, candidate_texts, digest, load_dataset, read_json, write_json


def resolved(path):
    path = Path(path)
    return path if path.is_absolute() else ROOT / path


def environment():
    import torch
    return {'python': sys.version, 'platform': platform.platform(),
            'packages': {name: importlib.metadata.version(name) for name in
                         ['torch', 'transformers', 'sentence-transformers', 'psutil', 'huggingface-hub']},
            'cuda_runtime': torch.version.cuda, 'cuda_available': torch.cuda.is_available(),
            'gpu': torch.cuda.get_device_name() if torch.cuda.is_available() else None,
            'gpu_properties': str(torch.cuda.get_device_properties(0)) if torch.cuda.is_available() else None}


def diagnostics(encoder, cases):
    import torch
    from encoders import ContextOverflow
    from measure import measured
    records = []
    for index, case in enumerate(cases):
        record = {'case_id': case.get('id', str(index)), 'case_sha256': digest(case),
                  'language': case.get('language'), 'action_ids': [a['id'] for a in case['actions']],
                  'language_supported_claim': case.get('language') in encoder.spec['languages']}
        try:
            (features, detail), metrics = measured(lambda: encoder.represent(case), encoder.device)
            record.update(status='ok', representation=detail, metrics=metrics,
                          pooled_embeddings=features.cpu().tolist(), interpretation='Representation diagnostic only; no action preferences')
            if encoder.sentence_model is not None:
                # Check native official sentence embeddings after our explicit length guard.
                embeddings = encoder.sentence_model.encode(candidate_texts(case), convert_to_tensor=True)
                record['sentence_transformer_embedding_shape'] = list(embeddings.shape)
                record['sentence_transformer_embeddings_finite'] = bool(torch.isfinite(embeddings).all())
        except ContextOverflow as error:
            record.update(status='context_overflow', error=str(error))
        records.append(record)
    return records


def smoke_training(encoder, output, config):
    import torch
    from encoders import ContextOverflow, fingerprint
    from heads import ScoringHead, load_head, save_head, score, train_head
    dataset, cases = load_dataset(ROOT / 'fixtures/synthetic.json', labeled=True)
    features = [encoder.represent(case)[0] for case in cases]
    before_encoder = fingerprint(encoder.model)
    first = ScoringHead(encoder.hidden_size, config['head_hidden_size']).to(encoder.device)
    before_first = fingerprint(first)
    losses = train_head(first, features, cases, 12)
    after_first = fingerprint(first)
    first_path = output / 'synthetic-head-a.pt'
    save_head(first_path, first, encoder, config['head_hidden_size'], dataset, 12)
    restored, metadata = load_head(first_path, encoder)
    with torch.no_grad():
        identical = all(torch.equal(first(value), restored(value)) for value in features)
    second = ScoringHead(encoder.hidden_size, config['head_hidden_size']).to(encoder.device)
    before_second = fingerprint(second)
    second_losses = train_head(second, features, cases, 12)
    save_head(output / 'synthetic-head-b.pt', second, encoder, config['head_hidden_size'], dataset, 12)
    reverse = copy.deepcopy(cases[0])
    reverse['actions'].reverse()
    original = score(first, features[0], cases[0])
    reordered = score(first, encoder.represent(reverse)[0], reverse)
    permutation_delta = max(abs(original['scores'][key] - reordered['scores'][key]) for key in original['scores'])
    overlong = copy.deepcopy(cases[0])
    overlong['situation']['description'] = 'door ' * (encoder.max_length + 1)
    try:
        encoder.represent(overlong)
    except ContextOverflow as error:
        overflow = str(error)
    else:
        raise AssertionError('Overlong input was silently accepted')
    checks = {'encoder_unchanged': before_encoder == fingerprint(encoder.model),
              'first_head_changed': before_first != after_first, 'second_head_changed': before_second != fingerprint(second),
              'first_head_unchanged_after_second_training': after_first == fingerprint(first),
              'reload_scores_bitwise_equal': identical,
              'encoder_has_no_gradients': all(p.grad is None and not p.requires_grad for p in encoder.model.parameters()),
              'permutation_invariant_by_id': permutation_delta < 1e-5}
    result = {'synthetic': True, 'quality_evidence': False, 'checks': checks, 'losses_a': losses,
              'losses_b': second_losses, 'encoder_sha256': before_encoder, 'head_a_sha256': after_first,
              'permutation_max_delta': permutation_delta, 'overflow_rejection': overflow,
              'example_scores': original, 'example_scores_label': 'Artificial smoke data only; no literary validity'}
    write_json(output / 'training.json', result)
    if not all(checks.values()):
        raise AssertionError(f'Training verification failed: {checks}')
    return result


def worker(args):
    import torch
    from encoders import Encoder
    from heads import ScoringHead, load_head, save_head, score, train_head
    from measure import measured
    config = read_json(ROOT / 'config.json')
    torch.manual_seed(config['seed'])
    if args.device == 'cuda' and not torch.cuda.is_available():
        raise RuntimeError('CUDA requested but unavailable; no implicit CPU fallback')
    output = resolved(args.output)
    status = {'model': args.model, 'status': 'failed', 'environment': environment()}
    try:
        encoder, metrics = measured(lambda: Encoder(args.model, args.device), args.device)
        status.update(encoder=encoder.metadata(), load=metrics)
        write_json(output / 'model.json', status)
        dataset, cases = load_dataset(resolved(args.input), labeled=args.action == 'train')
        write_json(output / 'input.json', dataset)
        _, status['warmup'] = measured(lambda: encoder.represent(cases[0]), args.device)
        if args.action in ['smoke', 'diagnose']:
            status['diagnostics'] = diagnostics(encoder, cases)
            write_json(output / 'diagnostics.json', status['diagnostics'])
            if args.action == 'smoke':
                status['training'], status['training_metrics'] = measured(lambda: smoke_training(encoder, output, config), args.device)
        elif args.action == 'train':
            before = __import__('encoders').fingerprint(encoder.model)
            features = [encoder.represent(case)[0] for case in cases]
            head = ScoringHead(encoder.hidden_size, config['head_hidden_size']).to(args.device)
            losses, train_metrics = measured(lambda: train_head(head, features, cases, args.steps), args.device)
            save_head(output / 'head.pt', head, encoder, config['head_hidden_size'], dataset, args.steps)
            if before != __import__('encoders').fingerprint(encoder.model):
                raise AssertionError('Encoder changed during training')
            status.update(losses=losses, training_metrics=train_metrics, synthetic=dataset.get('synthetic', False))
        elif args.action == 'score':
            if not args.head:
                raise ValueError('Scoring requires a separately trained --head')
            head, metadata = load_head(resolved(args.head), encoder)
            status['head_metadata'] = {k: v for k, v in metadata.items() if k != 'state'}
            status['predictions'] = [dict(case_id=case.get('id'), **score(head, encoder.represent(case)[0], case)) for case in cases]
        status['status'] = 'ok'
    except Exception as error:
        status.update(error_type=type(error).__name__, error=str(error), traceback=traceback.format_exc())
        print(status['traceback'], file=sys.stderr)
    write_json(output / 'status.json', status)
    return 0 if status['status'] == 'ok' else 1


def run_workers(args, keys):
    output = resolved(args.output)
    output.mkdir(parents=True, exist_ok=False)
    write_json(output / 'config.json', read_json(ROOT / 'config.json'))
    statuses = {}
    for key in keys:
        directory = output / key
        directory.mkdir()
        command = [sys.executable, str(ROOT / 'cli.py'), args.action, '--worker', '--model', key,
                   '--input', str(resolved(args.input)), '--output', str(directory), '--device', args.device, '--steps', str(args.steps)]
        if args.head:
            command += ['--head', str(resolved(args.head))]
        with (directory / 'worker.log').open('w', encoding='utf-8') as log:
            result = subprocess.run(command, stdout=log, stderr=subprocess.STDOUT)
        path = directory / 'status.json'
        statuses[key] = read_json(path) if path.exists() else {'status': 'failed', 'exit_code': result.returncode, 'error': 'Worker exited before status; see worker.log'}
        print(f"{key}: {statuses[key]['status']}", flush=True)
    write_json(output / 'results.json', statuses)
    return 0 if all(s['status'] == 'ok' for s in statuses.values()) else 1


def main():
    parser = argparse.ArgumentParser(__doc__)
    parser.add_argument('action', choices=['download', 'smoke', 'diagnose', 'train', 'score', 'report'])
    parser.add_argument('--model', choices=list(read_json(ROOT / 'config.json')['models']))
    parser.add_argument('--input', default='fixtures/short.json')
    parser.add_argument('--output', default='runs/local-001')
    parser.add_argument('--head')
    parser.add_argument('--device', choices=['cpu', 'cuda'], default='cuda')
    parser.add_argument('--steps', type=int, default=12)
    parser.add_argument('--worker', action='store_true')
    args = parser.parse_args()
    keys = [args.model] if args.model else list(read_json(ROOT / 'config.json')['models'])
    if args.action == 'download':
        from download import download_models
        download_models(keys)
        return 0
    if args.action == 'report':
        from report import render_report
        render_report(resolved(args.output))
        return 0
    if args.action in ['train', 'score'] and not args.model:
        parser.error('train and score require --model')
    return worker(args) if args.worker else run_workers(args, keys)


if __name__ == '__main__':
    sys.exit(main())
