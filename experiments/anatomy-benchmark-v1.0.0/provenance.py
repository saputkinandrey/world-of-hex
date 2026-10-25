"""Save official documentation and immutable source revisions, without model execution."""
from pathlib import Path

import httpx

from common import ROOT, read, sha, write


def main():
    sources = ROOT/'sources'
    sources.mkdir(exist_ok=True)
    records = {}
    with httpx.Client(follow_redirects=True,timeout=60) as client:
        for repo, files in {
            'facebookresearch/sapiens2':['docs/SEG.md','LICENSE.md'],
            'pirocheto/schp-human-parsing':['README.md'],
            'shitagaki-lab/see-through':['inference/demo/bodypartseg_sam.ipynb'],
            'facebookresearch/detectron2':['projects/DensePose/doc/GETTING_STARTED.md','projects/DensePose/doc/DENSEPOSE_IUV.md'],
        }.items():
            response = client.get('https://api.github.com/repos/'+repo+'/commits/HEAD')
            response.raise_for_status()
            revision = response.json()['sha']
            records[repo] = {'revision':revision,'files':{}}
            for name in files:
                url = f'https://raw.githubusercontent.com/{repo}/{revision}/{name}'
                response = client.get(url)
                response.raise_for_status()
                destination = sources/(repo.replace('/','--')+'--'+name.replace('/','--'))
                destination.write_bytes(response.content)
                records[repo]['files'][name] = {'url':url,'sha256':sha(destination)}
        for key in ['schp','sapiens2','seethrough-sam']:
            spec = read(ROOT/'config.json')[key]
            response = client.get('https://huggingface.co/api/models/'+spec['repo'],params={'revision':spec['revision']})
            response.raise_for_status()
            write(sources/(key+'-hub.json'),response.json())
        records['sapiens2_access'] = {'gated':False,'acceptance_dialog_required':False,'license':'Custom Sapiens2 License; license text retained.',
                                     'distribution':'Weights excluded from Git; research use is acknowledged in report.'}
    write(sources/'records.json',records)


if __name__=='__main__': main()
