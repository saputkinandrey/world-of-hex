"""Actual upstream cuts and patches, bound to persisted evidence checksums."""
import json
from PIL import Image
import numpy as np
from parts import command
from preprocess import OUTPUT, SOURCES, sha
from evidence_store import locked, verify, write_json
from head_localization import head_support, MissingNeuralHead


def main():
    with locked():
        for view in SOURCES:
            evidence,metadata = verify(view,'layerdiff')
            folder = OUTPUT/'parts'/view
            link = folder/'evidence.json'
            if not link.exists() or json.loads(link.read_text())['manifest_sha256'] != sha(evidence/'manifest.json'):
                continue
            proposal_path = folder/'proposal/proposal.json'
            parts_path = folder/'assembly/rig/parts.json'
            if not proposal_path.exists() or not parts_path.exists():
                continue
            config = json.loads((folder/'config.json').read_text())
            proposal = json.loads(proposal_path.read_text())
            names = {part['name'] for part in json.loads(parts_path.read_text())['parts']}
            cuts = []
            for side in ('r','l'):
                chain = next((bone for bone in proposal['bones'] if bone.get('chain')=='sleeve_'+side),None)
                if chain and 'handwear_'+side in names:
                    y = chain['points'][1][1]
                    cuts.append({'from':'handwear_'+side,'into':'forearm_'+side,
                        'polygon':[[0,y],[512,y],[512,512],[0,512]],'draw':'front','overlap':1})
            config['assemble']['cuts'] = cuts
            config['note'] = 'Neural/upstream sleeve geometry only; elbow identity unverified.'
            path = folder/'cuts-config.json'
            write_json(path,config)
            arguments = ['--source',evidence/'input.png','--full',folder/'wrapper','--config',path,
                         '--project','visible','--seam','silhouette']
            (folder/'cuts/evidence.json').unlink(missing_ok=True)
            result = command(['assemble',*arguments,'--out',folder/'cuts'],folder/'cuts.log')
            if result.returncode == 0:
                write_json(folder/'cuts/evidence.json',{'manifest_sha256':sha(evidence/'manifest.json')})
            alpha = np.asarray(Image.open(evidence/'raw/layers/head.png'))[...,3]
            try:
                support = head_support(alpha)
            except MissingNeuralHead:
                continue
            x,y,w,h = Image.fromarray(support).getbbox()
            config['assemble']['patches'] = [{'name':'neural_head_source_patch','box':[x,y,w,h],
                                              'alpha':'silhouette','draw':'front'}]
            patch = folder/'patch-config.json'
            write_json(patch,config)
            arguments[arguments.index(path)] = patch
            command(['assemble',*arguments,'--out',folder/'patch-trial'],folder/'patch.log')


if __name__ == '__main__':
    main()
