# Isolated See-through experiment

This experiment reads the reviewed South/South-West body art and ownership masks. It does not replace production images, masks, rigs, animation resources, ligaments or depth ordering. All candidate outputs are under `tmp/animation-workbench/seethrough-probe/`.

## Inputs and coordinates

`prepare_seethrough_probe.py` came from the supplied `seethrough_hex_probe.zip`. It extracts the first square idle frame and produces eight model inputs: S/SW, 512/768, nearest/bicubic. Each input is composited over white; source RGBA and reviewed ownership RGB/alpha are kept separately. The body registration must be identity; unsupported transforms fail explicitly.

The manifest records SHA-256 for original atlases, original owner PNGs, native frame copies, comparison masks and model inputs. Pixel edges transform as `input = native * scale + offset`. Pixel-center indices transform as `input = (native + 0.5) * scale + offset - 0.5`; the inverse is `(input + 0.5 - offset) / scale - 0.5`. Future semantic labels must use nearest sampling; generated RGB colors are not anatomical ownership labels.

## Environment

Use a separate tooling checkout on the internal C: NVMe SSD, outside this game repository. D: is an external USB HDD and is not used. The local tooling directory contains:

- `see-through-windows/`: unofficial wrapper source, commit `917bebbb31336bde2b86d12293f8975b1c4615f4`.
- `see-through-windows/see-through/`: official upstream, commit `df019de5129d6c4b406587a14c3501669441a783`.
- `see-through-windows/see-through/.venv/`: isolated Python 3.12.9.
- `uv-0.5.29/uv.exe`: portable installer version used by the supplied Windows recipe.
- `cache/`: Hugging Face and Torch caches, explicitly kept on C:.

Set `tmp/animation-workbench/seethrough-probe/runtime.json` to `{"tooling":"C:/path/to/hex-animation-tooling"}`. The runtime fails when configuration or an executable is missing; it does not choose another disk or environment silently.

Bootstrap this isolated environment with `uv venv --python 3.12 <upstream>/.venv`, then install the official `torch==2.8.0+cu128`, `torchvision==0.23.0+cu128`, `torchaudio==2.8.0+cu128` wheels from `https://download.pytorch.org/whl/cu128` using `uv pip install --python <venv-python>`. The `install` action below installs the upstream base requirements and pinned bitsandbytes tier. Optional training/detectron/SAM/mmcv tiers are not required by this PSD entrypoint and are not installed speculatively.

## Stable commands

Run `./godot/modules/character-animation-workbench/run-seethrough-probe.ps1 <action>`:

- `prepare`: regenerate the eight derived inputs and provenance manifest.
- `check`: verify every checksum, source pixels, mask alpha/RGB, actual resampling and every native pixel-center coordinate round trip.
- `install`: install upstream base and NF4 dependencies into the isolated environment, with the complete output in `dependencies.log`.
- `cuda`: verify a real CUDA bf16 matrix multiplication and import the actual upstream PSD entrypoint without downloading weights. Results go to `cuda.json` and `cuda.log`.
- `offload-check`: run two consecutive tag batches through the real upstream method with two small real CLIP encoders and the same Accelerate offload chain.
- `bicubic`: run the official PSD pipeline on SW bicubic 512.
- `nearest`: run the same pipeline on SW nearest 512.

Both inference actions use NF4, CPU offload, seed 42, 20 steps, body/depth resolution 512 and left/right splitting. Group offload is disabled as in the wrapper's CPU-offload invocation. The genuine `inference/scripts/inference_psd_quantized.py` performs decomposition, depth and PSD assembly; no substitute assembler is implemented. Full inference logs and candidate PSD/layers remain in the probe directory. A successful exit without a PSD is reported as a failure.

## Local upstream compatibility correction

On the pinned Windows environment, the unmodified CPU-offload path failed while caching the second (head) tag batch: the second CLIP encoder could remain on CUDA while the first encoder was on CPU. The pipeline selected token placement from the first encoder. Accelerate skips moving inputs when the called module is already on its execution device, producing a CPU/CUDA embedding mismatch. The small two-encoder `offload-check` reproduced that exact failure without NF4 weights; replacing the selected device with the pipeline's `_execution_device` made both consecutive batches pass.

`tools/seethrough-cpu-offload.patch` records the correction to the separate upstream checkout. Apply it from that checkout with `git apply <absolute-patch-path>` when reproducing a fresh installation, then run `offload-check`. No game renderer or deformation algorithm is patched. A passing offload regression still does not establish full inference or visual quality.

The full run exposed further placement issues in this CPU-offload path. Direct VAE encode/decode hooks did not transfer their input tensors, so the NF4 caller keeps the ordinary VAE resident on the GPU, removing it from the offload sequence and adding it to the exclusion list. TransparentVAE is optional in the upstream constructor and absent from Diffusers' managed components; it is explicitly moved to the same GPU. The main UNet retains CPU offload. After tag caching replaces the encoders with Identity, the pipeline's generic `_execution_device` can resolve to CPU; denoising therefore uses the explicitly configured `_offload_device`, preserving the original UNet device when offload is absent. The patch changes tensor placement, not model weights, denoising math or assembly logic.

## Visual gate

Inspect head/shoulder separation, fists versus torso, both legs, calf/foot boundaries and the original black outlines on both 512 variants. Recovered hidden pixels are generated art, not evidence about original ownership. A clothing/feature layer name does not imply a Hex bone mapping. If neither variant recognizes useful anatomy, record the negative result and stop before mask integration or 768 inference. A successful CUDA check or a valid PSD alone does not establish visual quality.

`rig-c/parts` is the subsequent PSD integration stage from `CODEX-NEXT-STAGE.md`; it is not reimplemented by these experiment tools.

## Observed local results (2026-10-23)

Both SW 512 variants completed the official decomposition, depth and PSD assembly on the RTX 3060 Laptop 6 GB. Each produced a normal PSD and a depth PSD, all 512 x 512; reopening the normal PSDs with the installed psd-tools enumerated 15 layers each. The CUDA bf16 check, upstream imports, offload regression, eight-input resampling/provenance checks and patch reverse-application check passed.

| Variant | Decomposition seconds | Depth seconds | Total seconds | PyTorch peak allocated GiB |
| --- | ---: | ---: | ---: | ---: |
| Bicubic 512 | 274.6 | 15.1 | 513.0 | 4.42 |
| Nearest 512 | 303.9 | 48.2 | 384.1 | 4.42 |

The total includes pipeline loading and, for the first successful run, additional weight downloads. It excludes the earlier environment installation and compatibility debugging. PyTorch allocated memory is not total GPU memory including Windows/other applications.

The visual gate was **not met for anatomical ownership integration**. Both variants identify a head and two arm regions, but handwear contains whole arms, and topwear retains the body and legs. Neither legwear nor footwear has any pixel above alpha 128 in either raw body output. Bicubic bottomwear additionally contains unrelated border marks; nearest bottomwear is effectively empty. Several feature layers have low-alpha edge noise and a full-canvas bounding box. These are not reliable fourteen-bone ownership masks. The generated hidden art is retained only as candidate output.

No 768 inference or rig-parts assembly/proposal stage was run after this visual review. No production owner mask or artwork was changed. Head/arm recognition is partial evidence, not proof that the entire segmentation improved. No per-bone changed-owner table is claimed because a complete, meaningful semantic-to-bone mapping was not available.

Local artifacts are in `tmp/animation-workbench/seethrough-probe/`: `manifest.json`, `result-manifest.json` (model revisions, PSD checksums, patch hash and runtime), `environment-freeze.txt`, `RESULTS.md`, both `*-layers.png` contact sheets, original failed-attempt logs, final inference logs, PSD layer inventories and `results/<variant>/` PSD/PNG/depth outputs. The first native torch_cpu.dll access violation was not reproduced on subsequent cached loads; its cause is not asserted.

## Standards review

No actionable documented-standard or complexity-smell findings. The final bounded upstream compatibility patch and its real-module regression received follow-up review.

## Spec review

No source-coordinate, provenance or scope defect found. Technical completion and the failed anatomical visual gate are recorded separately. A valid PSD and passing CUDA test are not reported as visual success.
