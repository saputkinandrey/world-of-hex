"""Reproduce both consecutive tag-cache calls with real CLIP/offload modules."""
from types import SimpleNamespace

import torch
from accelerate import cpu_offload_with_hook
from transformers import CLIPTextConfig, CLIPTextModel, CLIPTextModelWithProjection
from modules.layerdiffuse.diffusers_kdiffusion_sdxl import KDiffusionStableDiffusionXLPipeline


class ProbeTokenizer:
    model_max_length = 8

    def __call__(self, prompts, **kwargs):
        return SimpleNamespace(input_ids=torch.ones((len(prompts),8),dtype=torch.long))


def main():
    config = CLIPTextConfig(vocab_size=16,hidden_size=16,intermediate_size=32,
                            projection_dim=16,num_hidden_layers=2,num_attention_heads=2,
                            max_position_embeddings=8)
    first, second = CLIPTextModel(config), CLIPTextModelWithProjection(config)
    device = torch.device('cuda:0')
    _, hook = cpu_offload_with_hook(first,device)
    cpu_offload_with_hook(second,device,prev_module_hook=hook)
    pipeline = SimpleNamespace(text_encoder=first,text_encoder_2=second,
                               tokenizer=ProbeTokenizer(),tokenizer_2=ProbeTokenizer(),
                               unet=SimpleNamespace(dtype=torch.float32),
                               _execution_device=torch.device('cuda:0'))
    encode = KDiffusionStableDiffusionXLPipeline.encode_cropped_prompt_77tokens
    for label in ['body','head']:
        print('Encoding '+label+' after previous offload state...',flush=True)
        hidden, pooled = encode(pipeline,[label])
        assert hidden.shape == (1,8,32) and pooled.shape == (1,16)
        assert torch.isfinite(hidden).all() and torch.isfinite(pooled).all()
    print('Both tag batches passed with the real upstream method and Accelerate hooks.')


if __name__ == '__main__':
    main()
