"""Execute the frozen reviewed implementation in its own baseline checkout."""
import argparse
import hashlib
import io
import json
from pathlib import Path
import subprocess
import shutil
import tarfile

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[3]
TARGET = REPO / 'tmp/animation-workbench/frozen-legacy/repo'
MODULE = Path('godot/modules/character-animation-workbench')


def isolate_project():
    # The game has unrelated invalid embedded ship scripts. This reference
    # project needs the original module/resource paths, not game autoloads.
    (TARGET/'godot/project.godot').write_text(
        'config_version=5\n[application]\nconfig/name="Hex Frozen Segmentation"\n'
        '[rendering]\nrenderer/rendering_method="gl_compatibility"\n')
    (TARGET/'godot/scenes/.gdignore').touch()


def scene_signature(data):
    lines = data.decode('utf-8').splitlines()
    resources = sorted(line for line in lines if line.startswith('[ext_resource '))
    body = [line for line in lines if line.strip() and not line.startswith('[ext_resource ')]
    return hashlib.sha256('\n'.join(resources+body).encode()).hexdigest()


def verify(root, manifest):
    for name, expected in manifest['files'].items():
        data = (root/name).read_bytes()
        actual = hashlib.sha256(data).hexdigest()
        # Windows text writers emit CRLF; Git's pinned blobs use LF.
        if actual != expected and Path(name).suffix in ('.json','.tscn','.tres','.gd','.md'):
            actual = hashlib.sha256(data.replace(b'\r\n',b'\n')).hexdigest()
        if actual != expected and name in manifest['scene_signatures']:
            if scene_signature(data) == manifest['scene_signatures'][name]:
                continue
        if actual != expected:
            raise ValueError('Frozen Legacy checksum mismatch: '+name)


def main(action):
    manifest = json.loads((HERE/'baseline.json').read_text())
    if action == 'prepare':
        if TARGET.exists():
            verify(TARGET, manifest)
            isolate_project()
            return
        data = subprocess.check_output(['git','archive',manifest['commit'],'godot'],cwd=REPO)
        TARGET.mkdir(parents=True)
        with tarfile.open(fileobj=io.BytesIO(data)) as archive:
            archive.extractall(TARGET, filter='data')
        verify(TARGET, manifest)
        isolate_project()
        print('Frozen Legacy ready: '+str(TARGET))
        return
    verify(TARGET, manifest)
    if action == 'verify':
        print('All frozen reference checksums match.')
        return
    actions = {
        'rebuild':['segmentation-author','mask-bake','segmentation-build'],
        'validate':['segmentation-check','segmentation-test','mask-test'],
        'diagnostics':['segmentation-report'],
        'render':['segmentation-video','segmentation-encode'],
        'import':['parse'],
    }
    for command in actions[action]:
        shell = shutil.which('pwsh')
        if shell is None:
            raise FileNotFoundError('PowerShell 7 (pwsh) is required, as for the current workbench')
        subprocess.run([shell,'-NoProfile','-ExecutionPolicy','Bypass','-File',
                        str(TARGET/MODULE/'run.ps1'),command],cwd=TARGET,check=True)
    verify(TARGET, manifest)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('action',choices=['prepare','verify','rebuild','validate','diagnostics','render','import'])
    main(parser.parse_args().action)
