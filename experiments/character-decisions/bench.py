"""Local sequential benchmark. No RPC, services, training or game imports."""
import argparse
import csv
import importlib.metadata
import hashlib
import json
import os
from pathlib import Path
import platform
import statistics
import subprocess
import sys
import traceback

from contracts import digest,load_cases,state_text,validate_prediction

ROOT = Path(__file__).resolve().parent


def write_json(path,value):
    Path(path).parent.mkdir(parents=True,exist_ok=True)
    Path(path).write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')


def configure(config):
    os.environ.update(HF_HOME=config['hf_home'],HF_HUB_OFFLINE='1',TRANSFORMERS_OFFLINE='1',USE_TF='0',TOKENIZERS_PARALLELISM='false')
    upstream = Path(config['upstream_root'])
    sys.path[:0] = [str(upstream/'laya'),str(upstream/'verdict')]


def worker(model_name,output,device):
    config = json.loads((output/'config.json').read_text())
    configure(config)
    import torch
    from adapters import load_adapter
    from measure import measured
    torch.set_num_threads(4)
    if device.startswith('cuda') and not torch.cuda.is_available():
        raise RuntimeError('CUDA requested but unavailable; explicitly choose cpu to compare on CPU')
    cases = load_cases(output/'cases.json')
    folder = output/model_name
    folder.mkdir()
    status = {'model':model_name,'device':device,'outcome':'loading'}
    write_json(folder/'status.json',status)
    print(model_name+': loading official checkpoint',flush=True)
    try:
        paths = json.loads((ROOT/'model-paths.json').read_text())
        receipt = paths[model_name]
        if any(receipt[key]!=config['models'][model_name][key] for key in ('repo','revision')):
            raise ValueError('Model path receipt differs from pinned configuration')
        for name,revision in config['upstream_revisions'].items():
            checkout = Path(config['upstream_root'])/name
            actual = subprocess.check_output(['git','-C',str(checkout),'rev-parse','HEAD'],text=True).strip()
            if actual!=revision:
                raise ValueError('Official implementation revision changed: '+name)
            subprocess.run(['git','-C',str(checkout),'diff','--quiet'],check=True)
        torch.manual_seed(config['seed'])
        adapter,load_metrics = measured(lambda:load_adapter(model_name,Path(receipt['path']),device,config['max_length']),
                                      device,config['rss_sample_interval_seconds'])
        warmup,warmup_metrics = measured(lambda:adapter.predict(cases[0]),device,config['rss_sample_interval_seconds'])
        status.update(outcome='running',completed=0,total=len(cases)*config['repeats'])
        write_json(folder/'status.json',status)
        print(model_name+': warmup completed; starting decisions',flush=True)
        versions = {name:importlib.metadata.version(name) for name in ('torch','transformers','numpy','psutil')}
        write_json(folder/'model.json',{'model':receipt,'adapter':adapter.metadata,'load':load_metrics,
            'warmup':warmup_metrics,'versions':versions,'platform':platform.platform(),
            'gpu':torch.cuda.get_device_name() if device.startswith('cuda') else None,
            'timing':'one unmeasured-for-aggregate warmup; CUDA synchronized; model loading separate'})
        failures = 0
        with (folder/'results.jsonl').open('w',encoding='utf-8') as stream:
            for repeat in range(config['repeats']):
                for case in cases:
                    row = {'model':model_name,'case_id':case['id'],'repeat':repeat,
                        'language':case.get('language'),'case_sha256':digest(case),'state_sha256':hashlib.sha256(state_text(case).encode()).hexdigest(),
                        'character_id':case.get('character_id'),'scenario_id':case.get('scenario_id'),
                        'context_variant':case.get('context_variant'),'order_variant':case.get('order_variant'),
                        'action_order':[a['id'] for a in case['actions']],
                        'probability_kind':adapter.metadata['probability_kind']}
                    try:
                        torch.manual_seed(config['seed'])
                        answer,metrics = measured(lambda:adapter.predict(case),device,config['rss_sample_interval_seconds'])
                        validate_prediction(answer,row['action_order'])
                        row.update(outcome='completed',**answer,**metrics)
                    except Exception:
                        failures += 1
                        row.update(outcome='case_failure',error=traceback.format_exc())
                        traceback.print_exc()
                    stream.write(json.dumps(row,ensure_ascii=False)+'\n')
                    stream.flush()
                    status['completed'] += 1
                    write_json(folder/'status.json',status)
        status.update(outcome='completed' if not failures else 'completed_with_case_failures',case_failures=failures)
    except Exception:
        status.update(outcome='model_failure',error=traceback.format_exc())
        traceback.print_exc()
    write_json(folder/'status.json',status)
    return status['outcome']!='completed'


def summarize(output):
    rows = []
    statuses = {}
    for folder in sorted(output.iterdir()):
        if not folder.is_dir() or not (folder/'status.json').exists():
            continue
        statuses[folder.name] = json.loads((folder/'status.json').read_text())
        if (folder/'results.jsonl').exists():
            rows.extend(json.loads(line) for line in (folder/'results.jsonl').read_text(encoding='utf-8').splitlines())
    write_json(output/'results.json',{'statuses':statuses,'results':rows})
    columns = ['model','case_id','repeat','language','character_id','scenario_id','context_variant','order_variant',
        'outcome','selected_action','abstained','probability_kind','probabilities','wall_seconds',
        'rss_baseline_bytes','rss_sampled_peak_bytes','rss_sampled_delta_bytes','cuda_peak_allocated_bytes','cuda_peak_reserved_bytes','error']
    with (output/'results.csv').open('w',encoding='utf-8',newline='') as stream:
        writer = csv.DictWriter(stream,fieldnames=columns,extrasaction='ignore')
        writer.writeheader()
        for row in rows:
            writer.writerow({**row,'probabilities':json.dumps(row.get('probabilities'),ensure_ascii=False)})
    aggregates = {}
    sensitivities = []
    for name in statuses:
        good = [r for r in rows if r['model']==name and r['outcome']=='completed']
        latencies = [r['wall_seconds'] for r in good]
        comparisons = {'order':[],'context':[],'character':[],'repeat':[]}
        grouped = {}
        for row in good:
            key = (row['repeat'],row['language'],row['character_id'],row['scenario_id'],row['context_variant'])
            grouped.setdefault(key,[]).append(row)
        for group in grouped.values():
            base = next((r for r in group if r['order_variant']=='original'),None)
            if not base:
                continue
            for row in group:
                if row['order_variant']=='original':
                    continue
                changed = row['selected_action']!=base['selected_action']
                keys = set(base['probabilities'])|set(row['probabilities'])
                tv = .5*sum(abs(base['probabilities'].get(k,0)-row['probabilities'].get(k,0)) for k in keys)
                comparisons['order'].append(changed)
                sensitivities.append({'model':name,'kind':'order','base':base['case_id'],'other':row['case_id'],
                    'language':row['language'],'repeat':row['repeat'],'choice_changed':changed,'total_variation':tv})
        index = {(r['repeat'],r['language'],r['character_id'],r['scenario_id'],r['context_variant'],r['order_variant']):r for r in good}
        for row in good:
            if row['order_variant']!='original':
                continue
            if row['context_variant']==0:
                other = index.get((row['repeat'],row['language'],row['character_id'],row['scenario_id'],1,'original'))
                if other:
                    changed = other['selected_action']!=row['selected_action']
                    comparisons['context'].append(changed)
                    sensitivities.append({'model':name,'kind':'context','base':row['case_id'],'other':other['case_id'],
                        'language':row['language'],'repeat':row['repeat'],'choice_changed':changed})
            if row['repeat']==0:
                other = index.get((1,row['language'],row['character_id'],row['scenario_id'],row['context_variant'],'original'))
                if other:
                    changed = other['selected_action']!=row['selected_action']
                    comparisons['repeat'].append(changed)
                    sensitivities.append({'model':name,'kind':'repeat','base':row['case_id'],'other':other['case_id'],
                        'language':row['language'],'base_repeat':0,'other_repeat':1,'choice_changed':changed})
        for language in ('en','ru'):
            for scenario in {r['scenario_id'] for r in good}:
                for context in (0,1):
                    choices = [r['selected_action'] for r in good if r['language']==language and r['scenario_id']==scenario and r['context_variant']==context and r['order_variant']=='original' and r['repeat']==0]
                    if len(choices)>1:
                        comparisons['character'].append(len(set(choices))>1)
        aggregates[name] = {'outcome':statuses[name]['outcome'],
            'successful_decisions':len(good),'failed_decisions':sum(r['model']==name and r['outcome']!='completed' for r in rows),
            'median_seconds':statistics.median(latencies) if latencies else None,
            'p95_seconds':sorted(latencies)[min(int(.95*len(latencies)),len(latencies)-1)] if latencies else None,
            'abstentions':sum(r['abstained'] for r in good),
            'sensitivity':{kind:{'comparisons':len(values),'choice_change_rate':sum(values)/len(values) if values else None} for kind,values in comparisons.items()}}
        aggregates[name]['memory'] = {
            field:max((r[field] for r in good if r.get(field) is not None),default=None)
            for field in ('rss_sampled_peak_bytes','cuda_peak_allocated_bytes','cuda_peak_reserved_bytes')}
        aggregates[name]['by_language'] = {language:{'decisions':len([r for r in good if r['language']==language]),
            'median_seconds':statistics.median([r['wall_seconds'] for r in good if r['language']==language]) if any(r['language']==language for r in good) else None}
            for language in ('en','ru')}
        for language in ('en','ru'):
            aggregates[name]['by_language'][language]['sensitivity'] = {}
            for kind in ('order','context','repeat'):
                paired = [row['choice_changed'] for row in sensitivities if row['model']==name and row['language']==language and row['kind']==kind]
                aggregates[name]['by_language'][language]['sensitivity'][kind] = {
                    'comparisons':len(paired),'choice_change_rate':sum(paired)/len(paired) if paired else None}
    write_json(output/'summary.json',{'models':aggregates,'interpretation':'Sensitivity statistics are not accuracy or proof of believable roleplay; language slices must be inspected separately.'})
    write_json(output/'sensitivity.json',sensitivities)


def run(args):
    config = json.loads((ROOT/'config.json').read_text())
    cases = load_cases(args.input)
    if args.limit:
        cases = cases[:args.limit]
    if args.repeats:
        config['repeats'] = args.repeats
    output = args.output.resolve()
    output.mkdir(parents=True,exist_ok=False)
    write_json(output/'cases.json',{'schema':'character-decisions/1','cases':cases})
    write_json(output/'config.json',config)
    models = args.models or list(config['models'])
    failed = False
    for name in models:
        with (output/(name+'.log')).open('w',encoding='utf-8') as log:
            process = subprocess.run([sys.executable,str(Path(__file__).resolve()),'worker','--model',name,
                '--output',str(output),'--device',args.device or config['device']],stdout=log,stderr=subprocess.STDOUT)
        print(name+': worker exit '+str(process.returncode),flush=True)
        failed |= process.returncode!=0
        if process.returncode:
            status_path = output/name/'status.json'
            previous = json.loads(status_path.read_text(encoding='utf-8')) if status_path.exists() else {'model':name}
            if previous.get('outcome') not in ('model_failure','completed_with_case_failures'):
                write_json(status_path,{**previous,'outcome':'worker_failure',
                    'exit_code':process.returncode,'log':str(output/(name+'.log'))})
    summarize(output)
    print('Saved JSON/CSV: '+str(output),flush=True)
    return failed


if __name__=='__main__':
    def positive_integer(value):
        number = int(value)
        if number<1:
            raise argparse.ArgumentTypeError('Expected a positive integer')
        return number

    parser = argparse.ArgumentParser()
    parser.add_argument('action',choices=['run','worker','summarize'])
    parser.add_argument('--input',type=Path,default=ROOT/'fixtures/suite.json')
    parser.add_argument('--output',type=Path,default=ROOT/'runs/comparison-001')
    parser.add_argument('--model')
    parser.add_argument('--models',nargs='+',choices=['laya_multilingual','laya_english','verdict_1_4','qwen3_1_7b'])
    parser.add_argument('--device',choices=['cpu','cuda'])
    parser.add_argument('--limit',type=positive_integer)
    parser.add_argument('--repeats',type=positive_integer)
    args = parser.parse_args()
    if args.action=='worker':
        sys.exit(1 if worker(args.model,args.output,args.device) else 0)
    elif args.action=='summarize':
        summarize(args.output)
    else:
        sys.exit(1 if run(args) else 0)
