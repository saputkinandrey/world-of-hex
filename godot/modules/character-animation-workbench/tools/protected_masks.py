"""Prevent legacy generators from replacing reviewed ownership data."""
import json
from pathlib import Path

LOCK = Path(__file__).resolve().parents[1]/'masks/segmentation-lock.json'


def protect(profiles, operation):
    if not LOCK.exists():
        return
    reviewed = set(json.loads(LOCK.read_text())['profiles'])
    protected = sorted(reviewed.intersection(profiles))
    if protected:
        raise ValueError(operation+' would overwrite manually reviewed masks: '+', '.join(protected)+
                         '. Edit authored-segmentation.json or the ownership PNGs; legacy regeneration is blocked.')
