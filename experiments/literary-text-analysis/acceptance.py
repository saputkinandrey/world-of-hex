"""Sequential real-model acceptance probes and immutable-output resume checks."""
import json
import os
import subprocess
import sys
from pathlib import Path

from common import ROOT, SCHEMA, digest, read, write


def call(arguments, log):
    with (ROOT/log).open('w', encoding='utf-8') as stream:
        subprocess.run([sys.executable, str(ROOT/'cli.py'), *arguments], check=True,
                       env=os.environ.copy(), stdout=stream, stderr=subprocess.STDOUT)


def snapshots(folder):
    paths = [*folder.glob('records/*.json'), *folder.glob('model_outputs/**/*.json')]
    return {str(p.relative_to(folder)): {'sha256':digest(p), 'size':p.stat().st_size, 'mtime_ns':p.stat().st_mtime_ns} for p in paths}


def main():
    for variable in ['PYTHONDONTWRITEBYTECODE','HF_HUB_OFFLINE','TRANSFORMERS_OFFLINE']:
        os.environ[variable] = '1'
    root = ROOT/'runs'
    # The short fixture has no long paragraph. This separate original stress input
    # checks technical overflow windows, not model quality or literary content.
    source = ROOT/'fixtures/long-paragraph.txt'
    if not source.exists():
        source.write_text(' '.join(['Mara carried a lantern while Rowan waited beside the bridge.'] * 100) + '\n', encoding='utf-8')
    parsed = ROOT/'fixtures/document-long.json'
    if not parsed.exists():
        call(['parse','--input',str(source),'--output',str(parsed),'--language','en','--authored-fixture'], 'long-parse.log')
    long_run = root/'acceptance-fable-long'
    call(['analyze','--input',str(parsed),'--output',str(long_run),'--model','fable','--language','en'], 'long-fable.log')
    raw = read(long_run/'model_outputs/fable/00000.json')
    text = read(parsed)['paragraphs'][0]['text']
    assert len(raw['windows']) > 1
    assert all(w['input_tokens'] <= 512 for w in raw['windows'])
    covered = set()
    for window in raw['windows']:
        for token in window['tokens']:
            covered.update(range(token['start'],token['end']))
    missing = [i for i, char in enumerate(text) if not char.isspace() and i not in covered]
    assert not missing, missing[:10]
    with (ROOT/'ner-control.log').open('w', encoding='utf-8') as stream:
        subprocess.run([sys.executable,str(ROOT/'ner_control.py')],check=True,
                       stdout=stream,stderr=subprocess.STDOUT,env=os.environ.copy())
    # One intentionally tiny context: both Qwen stages must fail explicitly,
    # preserve their error records, and never silently trim or run on CPU.
    overflow = root/'acceptance-qwen-context'
    call(['analyze','--input',str(ROOT/'fixtures/document-en.json'),'--output',str(overflow),
          '--model','qwen','--language','en','--end','1','--context-tokens','64'], 'context-overflow.log')
    record = read(overflow/'records/00000.json')
    assert record['status'] == 'ERROR'
    assert all(error['type'] == 'ContextOverflow' for error in record['stage_errors'])
    proofs = []
    for name, model, language in [('final-fable-en','fable','en'),('final-qwen-en','qwen','en'),('final-qwen-ru','qwen','ru')]:
        folder = root/name
        from positions import export_positions
        export_positions(read(folder/'document.json'), folder/'source-positions.json')
        before = snapshots(folder)
        assert len(list((folder/'records').glob('*.json'))) == 32
        call(['analyze','--input',str(ROOT/f'fixtures/document-{language}.json'),'--output',str(folder),
              '--model',model,'--language',language], f'resume-{name}.log')
        after = snapshots(folder)
        assert before == after, name
        check = read(folder/'resume-check.json')
        assert check['skipped'] == 32 and check['new_inferences'] == 0
        proofs.append({'model':model,'language':language,'run':name,'files_unchanged':len(before),
                       'new_inferences':0,'sizes_hashes_mtimes_identical':True})
    write(ROOT/'acceptance.json', {'schema_version':SCHEMA,'model':'per_probe','checkpoint_revision':'see_run_manifests',
          'processing':'real sequential CUDA probes and source/output invariant checks',
          'fable_long_windows':len(raw['windows']),'max_fable_input_tokens':max(w['input_tokens'] for w in raw['windows']),
          'long_paragraph_nonspace_characters_missing':0,'qwen_context_overflow_explicit':True,'resume_proofs':proofs})
    print(json.dumps({'long_windows':len(raw['windows']),'explicit_context_error':True,'resume_runs':len(proofs)}))


if __name__ == '__main__':
    main()
