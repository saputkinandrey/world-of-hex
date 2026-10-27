"""Explicit local runtime and external model-store paths for the experiment."""
import json
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent
OUTPUT_ROOT = Path(os.environ['MOTIONBRICKS_OUTPUT_ROOT']) if 'MOTIONBRICKS_OUTPUT_ROOT' in os.environ else ROOT
CONFIG = json.loads((ROOT / 'config.json').read_text(encoding='utf-8-sig'))
LOCAL_CONFIG = ROOT / 'config.local.json'
if LOCAL_CONFIG.exists():
    CONFIG.update(json.loads(LOCAL_CONFIG.read_text(encoding='utf-8-sig')))
RUNTIME_ROOT = Path(CONFIG['runtime_root'])
MODEL_ROOT = Path(CONFIG['model_root'])
REPO = RUNTIME_ROOT / 'motionbricks'

if not REPO.is_dir():
    raise FileNotFoundError(f'Missing isolated MotionBricks checkout: {REPO}; see README.md')
