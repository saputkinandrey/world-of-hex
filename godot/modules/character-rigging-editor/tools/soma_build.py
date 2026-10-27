"""Stable offline build/refit entrypoint. All outputs stay in this editor."""
import argparse
import traceback
import sys
sys.dont_write_bytecode=True

from soma_common import ROOT, VERSION, canonical, case_path, override_path, overrides, read, write
from soma_solver import accumulate, fit
from soma_sources import inventory, load_case


def persist_fit(result):
    key=result['key']
    write(case_path(key),result)
    write(ROOT/'poses'/case_path(key).relative_to(ROOT/'cases'),{'version':VERSION,'key':key,'soma_pose':result['soma_pose'],'camera':result['camera'],'art_corrections':result['manual'].get('art_corrections',{}),'geometry_id':result['geometry']['id']})
    return result


def build():
    if not (ROOT/'canonical.json').exists():
        from soma_canonical import export
        export()
    model=canonical()
    dataset=inventory()
    cases=[]
    for key in dataset.keys:
        case=load_case(dataset,key)
        write(ROOT/'observations'/case_path(key).relative_to(ROOT/'cases'),case)
        cases.append({'key':key,'pose':case['pose'],'view':case['view'],'review':case['source']['review']['status'], 'native_size':case['source']['native_size']})
    write(ROOT/'catalog.json',{'version':VERSION,'character':'Character1','cases':cases,'derived_mirrors_independent':False})
    case=read(ROOT/'observations/idle/south.json')
    baseline=persist_fit(fit(model,case,overrides('idle/south')))
    write(ROOT/'geometry.json',baseline['geometry'])
    print('South Idle fitted: '+str(baseline['metrics']),flush=True)
    for key in ['walk/south','idle/south-west','idle/north','idle/north-west']:
        case=read(ROOT/'observations'/case_path(key).relative_to(ROOT/'cases'))
        result=persist_fit(fit(model,case,overrides(key),baseline))
        print(key+': '+str(result['metrics']),flush=True)
    refresh_accumulation(model)


def refresh_accumulation(model):
    cases=[read(path) for path in sorted((ROOT/'cases').glob('*/*.json'))]
    result=accumulate(model,cases)
    write(ROOT/'accumulation.json',result)


def refit():
    request=read(ROOT/'cache/refit-request.json')
    key=request['key']
    patch=request['overrides']
    model=canonical()
    # Re-read immutable source data; never silently reuse stale masks.
    case=load_case(inventory(),key)
    baseline=None if key=='idle/south' else read(case_path('idle/south'))
    if request.get('validation_only'):
        result=fit(model,case,patch,baseline)
        write(ROOT/'cache/solver-validation/result.json',result)
        write(ROOT/'cache/refit-status.json',{'job':request['job'],'success':True,'key':key,'message':'Isolated GUI-to-CPU refit verified'})
        return
    result=fit(model,case,patch,baseline)
    pending=[result]
    if key=='idle/south':
        # Validate and solve every dependent case before replacing any result.
        # A stale override in another view must not leave mixed baseline fits.
        for path in sorted((ROOT/'cases').glob('*/*.json')):
            other=read(path)
            if other['key']==key: continue
            source=load_case(inventory(),other['key'])
            pending.append(fit(model,source,overrides(other['key']),result))
    for fitted in pending: persist_fit(fitted)
    write(override_path(key),patch)
    if key=='idle/south': write(ROOT/'geometry.json',result['geometry'])
    refresh_accumulation(model)
    write(ROOT/'cache/refit-status.json',{'job':request['job'],'success':True,'key':key,'message':result['metrics']['solver_message']})


if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('action',choices=['build','refit'])
    args=parser.parse_args()
    try:
        build() if args.action=='build' else refit()
    except Exception:
        if args.action=='refit':
            request=read(ROOT/'cache/refit-request.json')
            write(ROOT/'cache/refit-status.json',{'job':request['job'],'success':False,'key':request['key'],'message':traceback.format_exc()})
        raise
