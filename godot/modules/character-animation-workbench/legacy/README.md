# Frozen operational Legacy

This is the reviewed contour-based implementation at the commit in `baseline.json`, including its source-pixel corrections, reviewed masks, rigidity, meshes, diagnostics, tests and animation resources. It is not the obsolete seed-based segmentation.

Encapsulation uses `git archive` of the pinned Godot project into `tmp/animation-workbench/frozen-legacy/repo`. The executable copy retains original resource paths. This avoids altering the application or duplicating generated meshes in Git. Keep the pinned commit in repository history. No neural package or model is needed; the existing Python/Pillow, Godot and FFmpeg tools are used.

The isolated project uses the same compatibility renderer, with game autoloads and editor plugins omitted and unrelated `scenes/` excluded from editor scanning. This avoids pre-existing invalid embedded ship scripts outside the workbench. Module/source resources are unchanged. PowerShell 7 is required by the wrapper, matching the current local workflow.

From the repository root run `python godot/modules/character-animation-workbench/legacy/run.py <action>`:

- `prepare`: extract the pinned implementation and verify reference checksums.
- `import`: import the isolated Godot project before its first native test/render.
- `rebuild`: compile reviewed contours, production geometry and rigid diagnostics.
- `validate`: run contour/overwrite-protection regressions and native segmentation/mask tests.
- `diagnostics`: generate source/ownership atlases and component reports.
- `render`: render and validate/encode both existing four-direction comparison sequences.
- `verify`: check all immutable reference bytes.

Frozen output is under `tmp/animation-workbench/frozen-legacy/repo/tmp/animation-workbench/segmentation/`. Neural results never overwrite it. The baseline inventories all tracked module resources and tracked character art, preserving original Git-blob checksums. Binary artifacts must reproduce exactly. Windows-generated text may differ only by CRLF versus LF; verification normalizes that difference when the raw checksum differs. Any other mismatch is an error, not a baseline update.
