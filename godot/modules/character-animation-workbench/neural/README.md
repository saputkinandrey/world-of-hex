# Independent Neural experiment

This pipeline consumes the four original body sprites and alpha, neural layers and upstream assembly outputs. It does not import the Legacy owner masks, contours, landmarks, source-pixel corrections or calibrated joints. The fourteen bone names/palette define only the output contract. Unknown is index 0; ambiguous votes are not forced into a bone.

The current prototype's arm binding channels use rest-image sides: upstream `handwear-r` means smaller image X, so its upper/lower cuts map to Hex `ArmL`/`ForearmL`; upstream `-l` maps to `ArmR`/`ForearmR`. This is a declared output-namespace conversion, not a boundary adjustment or a claim about anatomical left/right. No masks, joint coordinates or disagreement minimization select this mapping.

Only `compare.py` reads frozen Legacy owners. Only `render.py` introduces the unchanged Hex skeleton, clips and directional depth for diagnostic integration, after recording candidate checksums. Those assets are not fed back into segmentation. Generated neural RGB is kept separate from exact visible-source RGBA.

## Commands

From the repository root:

- `./godot/modules/character-animation-workbench/neural/run.ps1 prepare`: source-only whole-canvas and alpha-content-crop controls, four views, nearest/bicubic 512. Margin is configured in `experiments.json`.
- `./godot/modules/character-animation-workbench/neural/run.ps1 test`: coordinate and confidence/component-localization regressions in the existing See-through environment.
- `./godot/modules/character-animation-workbench/neural/run.ps1 infer`: sequential, resumable genuine upstream GPU jobs listed in `experiments.json`; no reinstall or weight download. Each full-body run retains the original neural head layer and performs a detailed head pass using its strongest confident component. The original alpha-15 bounding box is recorded for comparison.

The remaining Python commands use the existing isolated See-through Python, whose location is derived from `tmp/animation-workbench/seethrough-probe/runtime.json` by `infer.settings()`:

- `python neural/parts.py controls` or `runs`: invoke actual upstream layers, sheet, propose-head-box, plan, assemble and propose; all refusals and guides are saved. Here and below `neural/` means this directory, not the repository root.
- `python neural/assembly_trials.py`: separate upstream polygon-cut experiments derived from upstream sleeve geometry, not calibrated Hex joints.
- `python neural/sam.py download` and `infer`: official SemanticSam checkpoint, strict state-dictionary loading, real 19-channel inference. Do not run concurrently with LayerDiff on this 6 GB GPU.
- `python neural/candidates.py`: conservative candidate masks, exact source chunks, generated-art candidates and per-decision provenance.
- `python neural/validate_candidates.py`: source RGBA, label domain, coverage/provenance checks; no claim of anatomical quality.
- `python neural/compare.py`: post-inference five-column atlases and disagreement by Legacy-region/bone pair. Different labels are not errors by definition.
- `python neural/heads.py`: additional 512-pixel head-only inference using a confident neural crop; raw eleven layers are retained separately. `parts.py heads` tests genuine two-run assembly.
- `python neural/head_underfill.py`: after a recorded hollow-head refusal, test upstream's documented full-face underfill separately; does not modify ownership. Wrapper action: `head-underfill`.
- `python neural/sam_evidence.py`: project recorded SAM logits into native coordinates after verifying input identity. This does not assign skeletal joints.
- `python neural/render.py`: isolated baseline renderer binding known candidate chunks only. Unknown pixels are displayed statically, gray in chunk mode and original RGBA in texture mode; they have no bone assignment. Original eight clips and skeletons remain unchanged. North has no known chunks, so its animation result is explicitly not measurable.
- `python neural/comparison_video.py`: validate matching manifests and complete frame sets, compose Legacy above Neural, then encode two comparison videos. Existing encoded videos are preserved; `--attempt LABEL` writes a separate presentation.

Stable root-level equivalents are `./godot/modules/character-animation-workbench/neural/run.ps1 <action>` with `parts-controls`, `parts-runs`, `parts-heads`, `assembly`, `sam-download`, `sam`, `sam-evidence`, `heads`, `candidates`, `validate`, `compare`, `render` or `comparison-video`. The wrapper selects the existing interpreter and UTF-8 paths. Keep GPU actions sequential so two models are never launched together unintentionally.

Inference cache reuse requires the same recipe fingerprint and input identity. Historical experiments produced before these guards were added remain evidence; their missing or older recipe is not retroactively invented. A guarded inference command therefore refuses to silently reuse them or overwrite them. Analysis commands can inspect their recorded raw outputs without rerunning the GPU. `infer.py --attempt LABEL`, `heads.py --attempt LABEL` and `sam.py infer --attempt LABEL` retain alternative raw experiments in separate directories. These alternatives are archival experiments, not an automatic choice for the primary downstream pipeline: parts/assembly/candidates/heads/SAM evidence explicitly use the primary directories. `parts.py runs` skips labeled alternatives. No new attempt is silently selected for the final comparison.

Install rig-parts outside the game repository, beside the existing tooling: `npm install --prefix <tooling>/rig-runtime bun@1.4.4 @rig-c/parts@1.60.1`. This installs no neural weights. Source and authoring guide were inspected at upstream commit `c51beae5e98b7f3154576f42569fcb7b6941fa50`; commands use the pinned published package. The upstream implementation owns all cuts, patches, assembly and bone proposals; `psd_adapter.py` only converts masked PSD layers to the supported RGBA wrapper input.

## Preserved evidence and limitations

Outputs are under ignored `tmp/animation-workbench/neural/`. Previous whole-canvas SW nearest/bicubic runs remain under `seethrough-probe/`. Model caches, environments, Bun and third-party code stay outside Git on C:. D: is unused.

The PSD reader of rig-parts refuses See-through's layer masks (`PSD_LAYER_PLAIN`). The input adapter uses psd-tools to materialize pixel plus mask as RGBA; original PSD and depth PSD remain unchanged. PSD ordering is preserved when complete per-layer depth medians are unavailable; this is explicitly reported by upstream. Raw Marigold PNGs and depth PSDs remain available as evidence.

See-through clothing/feature tags are not skeletal joints. A body/legs region inside topwear is useful evidence even when legwear is empty. The upstream proposer reports that leg chains require hip/knee/ankle keypoints; absent independently inferred joints, candidates leave the corresponding Hex bones unknown. Sleeve cuts are explicitly unverified geometric candidates, not measured elbows. No old Hex joint is substituted.

Foot candidates are accepted only when the neural footwear alpha has exactly two substantial connected components. Their image-X order selects the declared rest-image channels, not anatomical identity. Missing or ambiguous components remain unknown. This does not establish an ankle joint or prove that the component is a correct foot contour.

See [RESULTS.md](RESULTS.md) for actual experiments, visual defects, artifact locations and the recommendation.

Generated outside-source pixels are retained as candidates, including hallucinations, rather than automatically accepted as hidden anatomy. In-silhouette hidden ownership remains unresolved. Painting patches are a source-pixel assembly mechanism, not an independent anatomical prediction; unexplained holes are not silently assigned to a bone. No Hybrid is constructed before comparison and no experimental asset is promoted to the application.
