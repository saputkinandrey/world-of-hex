# Godot Agent Instructions

## Scene Structure
- Do not create Godot scene nodes at runtime unless the user explicitly requests it for the current task.
- Prefer explicit nodes in `.tscn` scenes so their names, hierarchy, visibility, transforms, and rendering order are inspectable in the editor.
- If runtime node creation is explicitly requested, keep it narrow and document which nodes are dynamic and why.

## Sprite Assets
- Do not add silent fallback asset paths, fallback sprites, fallback pose assets, or fallback direction assets unless the user explicitly requests that fallback behavior.
- If a pose, direction, layer, or variant has no matching asset, keep that absence explicit instead of rendering a different pose's asset.
