"""Verify the actual isolated CUDA runtime and upstream entrypoint imports."""
import json
from pathlib import Path
import runpy
import sys

def main(destination):
    import faulthandler
    faulthandler.dump_traceback_later(120,repeat=True)
    print('Importing isolated PyTorch...',flush=True)
    import torch
    print('Checking CUDA device and bf16 multiplication...',flush=True)
    if not torch.cuda.is_available():
        raise RuntimeError('CUDA is not available in the isolated See-through environment')
    device = torch.cuda.get_device_properties(0)
    sample = torch.ones((32,32),device='cuda',dtype=torch.bfloat16)
    result = sample @ sample
    torch.cuda.synchronize()
    if result[0,0].item() != 32:
        raise RuntimeError('CUDA bf16 matrix multiplication returned an incorrect result')
    # Load the genuine CLI without starting inference or downloading weights.
    print('CUDA multiplication passed; importing upstream PSD modules...',flush=True)
    runpy.run_path('inference/scripts/inference_psd_quantized.py',run_name='probe_import_check')
    report = {'python':sys.version,'torch':torch.__version__,'cuda':torch.version.cuda,
              'gpu':device.name,'vram_bytes':device.total_memory,'bf16_matmul':True,
              'upstream_imports':True}
    destination.write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    faulthandler.cancel_dump_traceback_later()


if __name__ == '__main__':
    main(Path(sys.argv[1]))
