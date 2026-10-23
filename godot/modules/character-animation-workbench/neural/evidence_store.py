"""Validated immutable snapshots; only explicit promotion changes current pointers."""
from contextlib import contextmanager
import json
import os
from pathlib import Path
import shutil
import tempfile
import uuid

import numpy as np
from PIL import Image
from preprocess import MODULE, SOURCES, sha

CURRENT = MODULE/'neural/evidence/current'
MODELS = ('layerdiff','semantic-sam')
BODY_TAGS = ['front hair','back hair','head','neck','neckwear','topwear','handwear',
             'bottomwear','legwear','footwear','tail','wings','objects']
HEAD_TAGS = ['headwear','face','irides','eyebrow','eyewhite','eyelash','eyewear',
             'ears','earwear','nose','mouth']
CLASSES = ['hair','headwear','face','eyes','eyewear','ears','earwear','nose','mouth',
           'neck','neckwear','topwear','handwear','bottomwear','legwear','footwear','tail','wings','objects']


def write_json(path, value):
    path = Path(path)
    path.parent.mkdir(parents=True,exist_ok=True)
    temporary = path.with_name(path.name+'.'+uuid.uuid4().hex+'.tmp')
    try:
        with temporary.open('w',encoding='utf-8',newline='\n') as stream:
            json.dump(value,stream,indent=2,ensure_ascii=True)
            stream.write('\n')
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temporary,path)
    finally:
        temporary.unlink(missing_ok=True)


@contextmanager
def locked(root=CURRENT):
    """Fail explicitly if another evidence reader/writer owns the lock."""
    root = Path(root)
    root.mkdir(parents=True,exist_ok=True)
    path = root.parent/'.evidence.lock'
    with path.open('a+b') as stream:
        stream.seek(0)
        if os.name == 'nt':
            import msvcrt
            msvcrt.locking(stream.fileno(),msvcrt.LK_NBLCK,1)
        else:
            import fcntl
            fcntl.flock(stream,fcntl.LOCK_EX | fcntl.LOCK_NB)
        try:
            yield
        finally:
            stream.seek(0)
            if os.name == 'nt':
                msvcrt.locking(stream.fileno(),msvcrt.LK_UNLCK,1)
            else:
                fcntl.flock(stream,fcntl.LOCK_UN)


def slot(view, model, root=CURRENT):
    if view not in SOURCES or model not in MODELS:
        raise ValueError('Unsupported evidence slot: '+str((view,model)))
    return Path(root)/view/model


def snapshot(view, model, root=CURRENT):
    directory = slot(view,model,root)
    pointer = json.loads((directory/'current.json').read_text())
    name = pointer['snapshot']
    if not name.startswith('snapshot-') or Path(name).name != name:
        raise ValueError('Invalid evidence pointer: '+name)
    path = directory/name
    manifest = json.loads((path/'manifest.json').read_text())
    if sha(path/'manifest.json') != pointer['manifest_sha256']:
        raise ValueError('Evidence manifest checksum changed: '+str(path))
    return path,manifest


def validate_payload(path, metadata):
    path = Path(path)
    image = metadata['input']
    if sha(path/'input.png') != image['input_sha256']:
        raise ValueError('Evidence input checksum mismatch')
    size = tuple(image['transform']['input_size'])
    if metadata['model'] == 'semantic-sam':
        if metadata['classes'] != CLASSES:
            raise ValueError('SemanticSam requires all nineteen original classes')
        with np.load(path/'raw/logits.npz',allow_pickle=False) as archive:
            logits = archive['logits']
            if logits.shape != (19,size[1],size[0]) or not np.issubdtype(logits.dtype,np.floating) or not np.isfinite(logits).all():
                raise ValueError('Invalid raw SemanticSam logits')
        for name in CLASSES:
            with Image.open(path/'raw'/(name+'.png')) as prediction:
                if prediction.size != size:
                    raise ValueError('Invalid model-coordinate SAM prediction: '+name)
    else:
        for tag in BODY_TAGS:
            with Image.open(path/'raw/layers'/(tag+'.png')) as layer:
                if layer.mode != 'RGBA' or layer.size != size:
                    raise ValueError('Invalid direct body prediction: '+tag)
        stages = metadata.get('stages',{})
        if stages.get('head') == 'success':
            for tag in HEAD_TAGS:
                with Image.open(path/'raw/layers'/(tag+'.png')) as layer:
                    if layer.mode != 'RGBA' or layer.size != size:
                        raise ValueError('Invalid head prediction: '+tag)
                if metadata.get('original_head_coordinates_available'):
                    with Image.open(path/'raw/layers/raw-head'/(tag+'.png')) as original:
                        if original.mode != 'RGBA' or original.size != size:
                            raise ValueError('Invalid original head coordinates: '+tag)
        if stages.get('depth') == 'success':
            info = json.loads((path/'raw/layers/info.json').read_text())
            if not info['parts']:
                raise ValueError('Successful depth stage requires part metadata')
            for name in info['parts']:
                with Image.open(path/'raw/layers'/(name+'_depth.png')) as depth:
                    if depth.size != size:
                        raise ValueError('Invalid depth coordinates: '+name)
            with Image.open(path/'raw/layers/reconstruction.png') as reconstruction:
                if reconstruction.size != size:
                    raise ValueError('Invalid reconstruction coordinates')
        if stages.get('export') == 'success':
            psds = [item for item in (path/'raw').glob('*.psd') if not item.stem.endswith('_depth')]
            if len(psds) != 1 or not psds[0].with_name(psds[0].stem+'_depth.psd').is_file():
                raise ValueError('Successful PSD export requires layered PSD and matching depth PSD')
    for item in path.rglob('*.png'):
        with Image.open(item) as image_file:
            image_file.verify()
    for item in path.rglob('*.psd'):
        from psd_tools import PSDImage
        psd = PSDImage.open(item)
        if psd.size != size:
            raise ValueError('PSD canvas differs from model coordinates: '+str(item))


def inventory(path):
    return {item.relative_to(path).as_posix():{'sha256':sha(item),'bytes':item.stat().st_size}
            for item in sorted(path.rglob('*')) if item.is_file() and item != path/'manifest.json'}


def verify(view, model, root=CURRENT):
    path,manifest = snapshot(view,model,root)
    if inventory(path) != manifest['files']:
        raise ValueError('Evidence files changed: '+str(path))
    validate_payload(path,manifest)
    return path,manifest


def recover_temporary(view, model, root=CURRENT):
    """Explicit inference-only recovery; readers never delete snapshot data."""
    directory = slot(view,model,root)
    current = verify(view,model,root)[0] if (directory/'current.json').exists() else None
    for old in directory.glob('snapshot-*'):
        if old != current:
            if old.resolve().parent != directory.resolve():
                raise ValueError('Orphan snapshot escapes its evidence slot')
            shutil.rmtree(old)
    staging = Path(root).parent/'.staging'
    for old in staging.glob('promotion-*'):
        if old.resolve().parent != staging.resolve():
            raise ValueError('Abandoned staging directory is redirected')
        shutil.rmtree(old)


def promote(view, model, populate, metadata, root=CURRENT):
    """Caller holds locked(); all validation precedes the atomic pointer change."""
    directory = slot(view,model,root)
    directory.mkdir(parents=True,exist_ok=True)
    staging_root = Path(root).parent/'.staging'
    staging_root.mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='promotion-',dir=staging_root) as temporary:
        staged = Path(temporary)/'snapshot'
        staged.mkdir()
        populate(staged)
        validate_payload(staged,metadata)
        manifest = {**metadata,'schema':'hex-neural-evidence/1','files':inventory(staged)}
        write_json(staged/'manifest.json',manifest)
        digest = sha(staged/'manifest.json')
        destination = directory/('snapshot-'+digest[:20])
        if destination.exists():
            if inventory(destination) != manifest['files'] or sha(destination/'manifest.json') != digest:
                raise ValueError('Existing snapshot digest collision or corruption')
        else:
            os.replace(staged,destination)
        try:
            write_json(directory/'current.json',{'snapshot':destination.name,'manifest_sha256':digest})
        except Exception:
            pointer = directory/'current.json'
            current = json.loads(pointer.read_text())['snapshot'] if pointer.exists() else None
            if destination.name != current and destination.resolve().is_relative_to(directory.resolve()):
                shutil.rmtree(destination)
            raise
        # Previous current remains intact until the pointer replacement succeeds.
        for old in directory.glob('snapshot-*'):
            if old != destination:
                if not old.resolve().is_relative_to(directory.resolve()):
                    raise ValueError('Superseded snapshot escapes evidence slot')
                shutil.rmtree(old)
    return destination,manifest


def status_update(view, model, attempt, root=CURRENT):
    path = Path(root)/'status.json'
    value = json.loads(path.read_text()) if path.exists() else {'schema':'hex-neural-status/1','views':{}}
    value['views'].setdefault(view,{})[model] = attempt
    other_bytes = sum(item.stat().st_size for item in Path(root).rglob('*') if item.is_file() and item != path)
    value['persistent_bytes'] = 0
    while True:
        total = other_bytes+len((json.dumps(value,indent=2,ensure_ascii=True)+'\n').encode('utf-8'))
        if total == value['persistent_bytes']:
            break
        value['persistent_bytes'] = total
    write_json(path,value)
