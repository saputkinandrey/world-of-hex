"""Render measured values without assigning psychological validity."""
import statistics

from contracts import ROOT, read_json


def render_report(directory):
    results = read_json(directory / 'results.json')
    keys = list(read_json(ROOT / 'config.json')['models'])

    def value(key, field):
        status = results.get(key, {})
        meta = status.get('encoder', {})
        training = status.get('training', {}).get('checks', {})
        diagnostics = [r for r in status.get('diagnostics', []) if r['status'] == 'ok']
        if field == 'loaded':
            return 'yes' if meta else 'no; see failure below'
        if field in ['parameters', 'max_length', 'architecture']:
            return str(meta.get(field, 'not measured'))
        if field == 'cuda':
            measurements = [status.get('load', {}), status.get('warmup', {})] + [r['metrics'] for r in diagnostics]
            peaks = [m['cuda_peak_allocated_bytes'] for m in measurements if m.get('cuda_peak_allocated_bytes') is not None]
            return f'{max(peaks)/2**20:.1f} MiB' if peaks else 'not measured'
        if field.startswith('latency_'):
            diagnostics = [r for r in diagnostics if r['language'] == field.removeprefix('latency_')]
            return f"{statistics.mean(r['metrics']['wall_seconds'] for r in diagnostics)*1000:.2f} ms" if diagnostics else 'not measured'
        if field == 'load':
            return f"{status['load']['wall_seconds']:.3f} s" if 'load' in status else 'failed'
        if field == 'ram':
            return f"{max(r['metrics']['rss_sampled_peak_bytes'] for r in diagnostics)/2**20:.1f} MiB" if diagnostics else 'not measured'
        if field == 'heads':
            return 'verified, two independent heads' if training and all(training.values()) else 'not verified'
        if field == 'russian':
            records = [r for r in diagnostics if r['language'] == 'ru']
            claimed = 'ru' in read_json(ROOT / 'config.json')['models'][key]['languages']
            return ('declared; ' if claimed else 'not declared; ') + ('finite representations only' if records else 'not verified')
        if field == 'encoder':
            return 'accessible, frozen' if meta.get('frozen') else 'not accessible'

    rows = [('Loaded on CUDA', 'loaded'), ('Encoder parameters', 'parameters'), ('Architecture', 'architecture'),
            ('Effective context (including special tokens)', 'max_length'), ('Russian', 'russian'),
            ('CUDA peak, load/warmup/inference', 'cuda'), ('Load time', 'load'),
            ('English request latency (all actions)', 'latency_en'), ('Russian request latency (all actions)', 'latency_ru'),
            ('Sampled process RAM peak during inference', 'ram'),
            ('Encoder access', 'encoder'), ('Head attachment/training/independence/reload', 'heads')]
    lines = ['# Local encoder experiment report', '', '| Metric | Literary MiniLM | FABLE | ruELECTRA |',
             '| --- | --- | --- | --- |']
    for title, field in rows:
        lines.append('| ' + title + ' | ' + ' | '.join(value(key, field) for key in keys) + ' |')
    lines += ['', '## Failures and limits', '']
    for key in keys:
        status = results[key]
        if status['status'] != 'ok':
            error = status.get('error', 'See worker.log')
            lines += [f"- {key}: {status.get('error_type', '')}: {error[:600]}",
                      f'  Full original error and traceback: `{key}/status.json`, `{key}/worker.log`.']
    lines += ['', 'Measurements use sequential fresh processes, FP32, batch = candidate actions, synchronized CUDA timing.',
              'Load, warmup, diagnostics and training are separate phases in results.json. Small sample; no throughput claim.',
              'CUDA peaks are PyTorch allocations including resident weights, excluding some driver/context memory.',
              'RSS sampling interval is 10 ms. OS lifetime peak is also recorded. English FABLE and Russian ruELECTRA',
              'are their declared language use cases; processing another script does not establish language competence.',
              '', '## Interpretation', '',
              'The successful frozen encoders support independent scalar heads with a variable number of arbitrary actions.',
              'The artificial smoke losses and scores are code verification only. No claims about character modeling quality.',
              'Technical convenience and model-specific limitations are discussed in README.md and provenance/*/CARD.md.',
              'A real experiment needs licensed scene-level decisions, character-visible information, plausible alternative',
              'actions, provenance, and independent held-out evaluation split by work/scene to prevent leakage.',
              'A universal non-literary encoder control is also needed to test the literary adaptation hypothesis.']
    (directory / 'REPORT.md').write_text('\n'.join(lines) + '\n', encoding='utf-8')
