"""Fetch pinned official artifacts into the external cache, without inference."""
import json
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def main():
    config = json.loads((ROOT/'config.json').read_text())
    os.environ['HF_HOME'] = config['hf_home']
    os.environ['HF_HUB_DISABLE_XET'] = '1'
    os.environ['HF_HUB_DOWNLOAD_TIMEOUT'] = '60'
    from huggingface_hub import snapshot_download
    receipts = {}
    for key,model in config['models'].items():
        patterns = ['*.json','*.safetensors','*.txt'] if not key.startswith('laya') else [
            'config.json','rl_agent_config.json','model.safetensors','tokenizer/*','encoder/*']
        destination = Path(config['hf_home'])/'decision-models'/key/model['revision']
        folder = snapshot_download(model['repo'],revision=model['revision'],local_dir=destination,
            cache_dir=str(Path(config['hf_home'])/'hub'),allow_patterns=patterns,max_workers=2)
        receipts[key] = {'repo':model['repo'],'revision':model['revision'],'path':folder}
        print(key+': '+folder,flush=True)
        (ROOT/'model-paths.json').write_text(json.dumps(receipts,indent=2)+'\n')


if __name__=='__main__':
    main()
