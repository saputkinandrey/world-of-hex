"""Create independent transition drafts without copying textures/geometry."""
import argparse
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--stage', choices=['C','D','E'], default='C')
stage = parser.parse_args().stage
poses = ['idle','aim-pistol'] if stage == 'C' else ['idle','walk','aim-pistol']
directions = ['south-west','north-west'] if stage == 'E' else ['south-west']
for direction in directions:
    for source in poses:
        for target in poses:
            if source == target:
                continue
            name = source.replace('-','_')+'_to_'+target.replace('-','_')
            path = ROOT/'transitions'/direction/f'{name}.json'
            if path.exists():
                continue
            switch = dict(switch_time=.5, blend_enabled=False, blend_duration=0.0)
            data = dict(version='1.0.0', id=name, direction=direction, source=source, target=target,
                        duration=1.0, interpolation='Ease In-Out', keys=[], switch_mode='Whole pose', whole=switch,
                        parts=[dict(switch) for _ in range(12)])
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(json.dumps(data,indent=2)+'\n')
if stage != 'C':
    sequence = dict(version='1.0.0', id='demonstration', fps=30,
                    directions=directions, intervals=[1.0]*6,
                    transitions=['idle_to_walk','walk_to_aim_pistol','aim_pistol_to_walk','walk_to_idle','idle_to_aim_pistol','aim_pistol_to_idle'])
    path=ROOT/'sequences/demo.json'
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(json.dumps(sequence,indent=2)+'\n')
