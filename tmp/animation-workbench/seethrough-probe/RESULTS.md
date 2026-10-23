# See-through probe results

Both GPU runs completed. The anatomical integration gate was not met.

| Variant | LayerDiff seconds | Depth seconds | Total seconds | PyTorch peak GiB |
| --- | ---: | ---: | ---: | ---: |
| bicubic 512 | 274.6 | 15.1 | 513.0 | 4.42 |
| nearest 512 | 303.9 | 48.2 | 384.1 | 4.42 |

Each variant produced a normal PSD and a depth PSD under results/<variant>/. Inputs, manifest.json, model revisions, compatibility-patch hash, PSD hashes and actual runtime versions are preserved. environment-freeze.txt records installed packages.

## Visual observations

- Head and arms are recognized in both body decompositions. handwear contains whole arm regions, not separate Hex upper-arm and forearm chunks.
- topwear retains the torso and both legs, and also reconstructs overlapping head/arm areas. A layer name cannot be mapped directly to one Hex bone.
- legwear and footwear have zero pixels with alpha > 128 in both variants. Their tiny low-alpha edge residue is not meaningful leg segmentation.
- Bicubic bottomwear also contains visible unrelated marks near the lower image border. Nearest bottomwear is effectively empty.
- Low-alpha border residue makes several raw layers have a full-canvas bounding box. The upstream head crop is consequently the full input for this case.
- Hidden reconstructed pixels and changed RGB are generated candidate art. They are not original source pixels and were not written back to the game.

The two layer sheets show the model input, reviewed native ownership, and raw model layers over a checkerboard. Alpha > 128 is a diagnostic count only; no model layer was threshold-edited.

No 768 run, bone-owner conversion, assembly-plan proposal or rig-parts integration was performed after this visual gate. No changed-owner-per-bone table is claimed: meaningful whole-body bone correspondence does not exist for these results. The prepared 768 files remain unused inputs.

## Installation and compatibility

All tooling, environment and caches are on C:. D: was read for hardware identification only; no files were written there. The original reviewed masks, sprites, rigs, animation resources, ligaments and depth ordering are unchanged.

The first native load exited 0xc0000005 in torch_cpu.dll; later cached loads did not reproduce it, and no cause is asserted. Subsequent deterministic CPU/GPU errors were reproduced and corrected by the recorded local upstream compatibility patch. Logs for the failed attempts remain alongside the final successful logs.

The two-real-CLIP/Accelerate regression failed on the unmodified method and passed after the device correction. The full two GPU runs additionally exercised VAE encode/decode, denoising, depth and native upstream PSD assembly.
