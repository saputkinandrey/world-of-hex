"""Preserve original diagnostics and verify frozen renders against their hashes."""
import hashlib
import json
from pathlib import Path
import shutil


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def verify_references(repo, target):
    manifest = json.loads(Path(__file__).with_name('reference-artifacts.json').read_text())
    original = repo/'tmp/animation-workbench/segmentation'
    frozen = target/'tmp/animation-workbench/segmentation'
    preserved = repo/'tmp/animation-workbench/frozen-legacy/reference'
    copied = 0
    for name,expected in manifest['files'].items():
        if digest(frozen/name) != expected:
            raise ValueError('Frozen diagnostic differs from original reference: '+name)
        destination = preserved/name
        if destination.exists():
            if digest(destination) != expected:
                raise ValueError('Preserved original reference changed: '+name)
            copied += 1
        elif (original/name).exists() and digest(original/name) == expected:
            destination.parent.mkdir(parents=True,exist_ok=True)
            shutil.copyfile(original/name,destination)
            copied += 1
    result = {'frozen_outputs_byte_equal':len(manifest['files']),
              'original_reference_files_preserved':copied,
              'reference_manifest_sha256':digest(Path(__file__).with_name('reference-artifacts.json')),
              'description':'2 MP4s and 586 PNG frames; no neural dependencies'}
    (preserved.parent/'equivalence.json').write_text(json.dumps(result,indent=2)+'\n')
    print(json.dumps(result,indent=2))
