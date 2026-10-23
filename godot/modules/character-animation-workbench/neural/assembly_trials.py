"""Test upstream cuts and painting patches using only neural/upstream geometry."""
import json

from parts import command
from preprocess import OUTPUT


def main():
    for folder in sorted((OUTPUT/'parts').glob('*crop*')):
        proposal_path = folder/'proposal/proposal.json'
        parts_path = folder/'assembly/rig/parts.json'
        if not proposal_path.exists() or not parts_path.exists():
            continue
        config = json.loads((folder/'config.json').read_text())
        proposal = json.loads(proposal_path.read_text())
        parts = json.loads(parts_path.read_text())
        names = {part['name'] for part in parts['parts']}
        cuts = []
        for side in ('r','l'):
            chain = next((bone for bone in proposal['bones'] if bone.get('chain') == 'sleeve_'+side),None)
            if chain is None or 'handwear_'+side not in names:
                continue
            y = chain['points'][1][1]
            cuts.append({'from':'handwear_'+side,'into':'forearm_'+side,
                         'polygon':[[0,y],[512,y],[512,512],[0,512]],
                         'draw':'front','overlap':1})
        config['assemble']['cuts'] = cuts
        config['note'] = 'Experimental independent geometry: cuts use upstream neural sleeve proposal, not measured Hex joints; anatomical correctness is unverified.'
        path = folder/'cuts-config.json'
        path.write_text(json.dumps(config,indent=2)+'\n')
        base_key = folder.name.removesuffix('-head')
        record = json.loads((OUTPUT/'inputs.json').read_text())[base_key]
        head_arguments = []
        if folder.name.endswith('-head'):
            view = base_key.removesuffix('-crop-nearest-512')
            head_arguments = ['--head',OUTPUT/'heads'/view]
        command(['assemble','--source',record['input'],'--full',folder/'wrapper',
                 *head_arguments,'--config',path,'--out',folder/'cuts','--project','visible',
                 '--seam','silhouette'],folder/'cuts.log')
        # A separate patch trial, never silently incorporated into ownership.
        holes = parts.get('recomposite',{}).get('holes',[])
        (folder/'patch-investigation.json').write_text(json.dumps({
            'mechanism':'assemble.patches copies painting RGBA inside a box; not anatomical inference',
            'uncovered_holes':holes,
            'decision':'No automatic hole-to-bone assignment. Patches require an evidenced anatomical region.'},indent=2)+'\n')
        # Demonstrate the real patch mechanism on an independently evidenced
        # head region. This trial is separate and never becomes ownership.
        localization = json.loads((OUTPUT/'runs'/base_key/base_key/'head-localization.json').read_text())
        x,y,width,height = localization['selected']['bbox']
        config['assemble']['patches'] = [{'name':'neural_head_source_patch',
            'box':[x,y,x+width,y+height],'alpha':'silhouette','draw':'front'}]
        config['note'] = 'Source-art patch bounded by the confident neural head. Mechanism trial only; this box is not a final anatomical contour.'
        patch_path = folder/'patch-config.json'
        patch_path.write_text(json.dumps(config,indent=2)+'\n')
        command(['assemble','--source',record['input'],'--full',folder/'wrapper',
                 *head_arguments,'--config',patch_path,'--out',folder/'patch-trial',
                 '--project','visible','--seam','silhouette'],folder/'patch.log')


if __name__ == '__main__':
    main()
