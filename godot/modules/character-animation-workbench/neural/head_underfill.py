"""Test upstream's documented hollow-head repair, separate from ownership."""
import json
from preprocess import OUTPUT
from parts import command


def main():
    key = 'south-west-crop-nearest-512'
    folder = OUTPUT/'parts'/(key+'-head')
    if 'SEETHROUGH_HEAD_RUN_HOLLOW' not in (folder/'plan.log').read_text():
        raise ValueError('This trial requires the recorded upstream hollow-head refusal')
    config = json.loads((folder/'config.json').read_text())
    config['assemble']['head_face_underfill'] = True
    config['note'] = 'Separate upstream full-face underfill trial; no source ownership or visible RGBA is replaced.'
    path = folder/'underfill-config.json'
    path.write_text(json.dumps(config,indent=2)+'\n')
    record = json.loads((OUTPUT/'inputs.json').read_text())[key]
    arguments = ['--source',record['input'],'--full',folder/'wrapper',
                 '--head',OUTPUT/'heads/south-west','--config',path]
    result = command(['assemble','--propose-plan',*arguments,'--write-config',path],folder/'underfill-plan.log')
    if result.returncode:
        return
    result = command(['assemble',*arguments,'--out',folder/'underfill-assembly',
                      '--project','visible','--seam','silhouette'],folder/'underfill-assemble.log')
    if result.returncode == 0:
        command(['propose','--parts',folder/'underfill-assembly/rig','--source',record['input'],
                 '--out',folder/'underfill-proposal'],folder/'underfill-propose.log')


if __name__ == '__main__':
    main()
