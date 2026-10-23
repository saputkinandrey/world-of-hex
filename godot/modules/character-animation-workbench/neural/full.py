"""Complete evaluation: independent model attempts first, downstream stages second."""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import traceback
from evidence_store import CURRENT, MODELS, inventory, locked, write_json
from inference_jobs import attempt_one
from preprocess import OUTPUT, SOURCES, prepare_view

STAGES = [('raw-analysis','raw_analysis.py'),('sam-evidence','sam_evidence.py'),
          ('assembly','parts.py','runs'),('assembly-cuts','assembly_trials.py'),
          ('candidate-ownership','candidates.py'),('conversion-loss','conversion_analysis.py'),
          ('candidate-validation','validate_candidates.py'),('legacy-comparison','compare.py'),
          ('diagnostic-render','render.py')]


def run_models(views, records, config, runner=attempt_one):
    results = {}
    for view in views:
        results[view] = {}
        for model in MODELS:
            method = config.get('evaluation_inputs',{}).get(model,{}).get(view,'nearest')
            key = view+'-crop-'+method+'-512'
            try:
                result = runner(view,model,records[key])
                results[view][model] = {'outcome':'available' if result is not None else 'inference_failure',
                    'stages':result.get('stages',{}) if result else {},
                    'export':result.get('export') if result else None}
            except Exception:
                results[view][model] = {'outcome':'inference_failure','error':traceback.format_exc()}
                traceback.print_exc()
    return results


def analyze():
    results = {}
    with locked():
        before = inventory(CURRENT)
    directory = OUTPUT/'analysis/stages'
    directory.mkdir(parents=True,exist_ok=True)
    for name,script,*arguments in STAGES:
        with (directory/(name+'.log')).open('w',encoding='utf-8') as log:
            result = subprocess.run([sys.executable,str(Path(__file__).with_name(script)),*arguments],
                                    stdout=log,stderr=subprocess.STDOUT)
        results[name] = {'outcome':'completed' if result.returncode==0 else 'stage_failure',
                         'exit_code':result.returncode,'log':str(directory/(name+'.log'))}
        # A failed conversion/render never prevents later independent diagnostics.
        print(name+': '+results[name]['outcome'],flush=True)
    with locked():
        after = inventory(CURRENT)
    proof = {'unchanged':before==after,'files_verified':len(before),
             'before_sha256':hashlib.sha256(json.dumps(before,sort_keys=True).encode()).hexdigest(),
             'after_sha256':hashlib.sha256(json.dumps(after,sort_keys=True).encode()).hexdigest()}
    write_json(OUTPUT/'analysis/read-only-proof.json',proof)
    results['evidence-read-only'] = {**proof,'outcome':'completed' if proof['unchanged'] else 'stage_failure'}
    return results


def main(views, analysis_only=False):
    OUTPUT.mkdir(parents=True,exist_ok=True)
    report = {'requested_directions':views,'models':list(MODELS),'analysis_only':analysis_only}
    with locked(OUTPUT/'work/session'):
        if not analysis_only:
            records,prepared = {},[]
            failures = {}
            for view in views:
                try:
                    records.update(prepare_view(view))
                    prepared.append(view)
                except Exception:
                    failures[view] = traceback.format_exc()
                    traceback.print_exc()
            previous = json.loads((OUTPUT/'inputs.json').read_text()) if (OUTPUT/'inputs.json').exists() else {}
            write_json(OUTPUT/'inputs.json',{**previous,**records})
            report['preprocessing_failures'] = failures
            config = json.loads(Path(__file__).with_name('experiments.json').read_text())
            report['inference'] = run_models(prepared,records,config)
            for view,error in failures.items():
                report['inference'][view] = {model:{'outcome':'blocked_input','error':error} for model in MODELS}
        report['downstream'] = analyze()
        if (CURRENT/'status.json').exists():
            report['latest_attempts'] = json.loads((CURRENT/'status.json').read_text())
        report['persistent_evidence_bytes'] = sum(path.stat().st_size for path in CURRENT.rglob('*') if path.is_file())
        report['technical_failures'] = bool(report.get('preprocessing_failures')) or any(
            row['outcome']=='inference_failure' for models in report.get('inference',{}).values() for row in models.values()) or any(
            row['outcome']=='stage_failure' for row in report['downstream'].values())
        report['anatomical_assembly'] = json.loads((OUTPUT/'parts/status.json').read_text()) if (OUTPUT/'parts/status.json').exists() else {}
        report['model_analysis'] = json.loads((OUTPUT/'analysis/raw-status.json').read_text()) if (OUTPUT/'analysis/raw-status.json').exists() else {}
        report['technical_failures'] |= any(
            outcome in ('inference_failure','downstream_failure')
            for models in report.get('inference',{}).values() for row in models.values()
            for outcome in row.get('stages',{}).values())
        report['technical_failures'] |= any(
            row.get(model,{}).get('outcome') == 'analysis_failure'
            for row in report['model_analysis'].values() for model in MODELS)
        report['incomplete'] = report['technical_failures'] or any(
            row['outcome'] != 'success' for row in report['anatomical_assembly'].values())
        # Poor recognition/export and assembly refusals remain visible independently
        # of process exit codes and successful structural validation.
        report['interpretation_reports'] = [str(OUTPUT/path) for path in (
            'analysis/raw-status.json','parts/status.json','analysis/conversion-loss.json')]
        write_json(OUTPUT/'evaluation.json',report)
        print(json.dumps({'report':str(OUTPUT/'evaluation.json'),
                         'persistent_evidence_bytes':report['persistent_evidence_bytes'],
                         'persistent_evidence_mib':round(report['persistent_evidence_bytes']/1024**2,2),
                         'incomplete':report['incomplete']},indent=2),flush=True)
    return report


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--directions',nargs='+',choices=list(SOURCES),default=list(SOURCES))
    parser.add_argument('--analysis-only',action='store_true')
    args = parser.parse_args()
    result = main(args.directions,args.analysis_only)
    if result['technical_failures']:
        sys.exit(1)
