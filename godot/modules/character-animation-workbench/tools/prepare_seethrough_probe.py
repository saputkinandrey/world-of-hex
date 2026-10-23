"""Prepare losslessly traceable Hex sprite inputs for local See-through tests.

Run from any directory with Python + Pillow. This reads the current repository
assets and reviewed ownership masks; it NEVER changes production files.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

from PIL import Image

ASSETS = {
    "south": ("Char1_south_idle", "Char1_body.png"),
    "north": ("Char1_north_idle", "Char1_body_back.png"),
    "south-west": ("Char1_south_west_idle", "Idle_body_SW1.png"),
    "north-west": ("Char1_north_west_idle", "Idle_body_NW1.png"),
}
RESAMPLING = {"nearest": Image.Resampling.NEAREST, "bicubic": Image.Resampling.BICUBIC}


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def locate_repo(explicit: Path | None, script: Path) -> Path:
    if explicit is not None:
        repo = explicit.resolve()
    else:
        # Installed at godot/modules/character-animation-workbench/tools/.
        repo = script.resolve().parents[4]
    expected = repo / "godot/modules/character-animation-workbench/masks/profiles.json"
    if not expected.is_file():
        raise FileNotFoundError(f"Hex repository not found (expected {expected}). Pass --repo PATH.")
    return repo


def source_frame(repo: Path, view: str) -> tuple[Image.Image, Path]:
    directory, filename = ASSETS[view]
    path = repo / "godot/assets/Character/Character1/idle" / directory / filename
    with Image.open(path) as atlas:
        # The workbench's segmentation_atlas.source() selects the first
        # square frame, using the atlas height as the cell size.
        height = atlas.height
        if atlas.width < height or atlas.width % height:
            raise ValueError(f"Unexpected atlas cell layout: {path} {atlas.size}")
        return atlas.convert("RGBA").crop((0, 0, height, height)), path


def make_input(source: Image.Image, size: int, method: str) -> tuple[Image.Image, dict]:
    side = max(source.size)
    scale = size / side
    width = round(source.width * scale)
    height = round(source.height * scale)
    left, top = (size - width) // 2, (size - height) // 2
    scaled = source.resize((width, height), resample=RESAMPLING[method])
    background = Image.new("RGBA", (size, size), "white")
    background.alpha_composite(scaled, (left, top))
    transform = {
        "native_dimensions": list(source.size),
        "input_dimensions": [size, size],
        "native_to_input_scale": [width / source.width, height / source.height],
        "native_to_input_offset": [left, top],
        "resampling": method,
        "background": "white (255,255,255)",
        "coordinate_contract": "Edge coordinates: input = native * scale + offset. Pixel-center indices: input = (native + 0.5) * scale + offset - 0.5.",
        "native_center_to_input_offset": [left + (width / source.width - 1) / 2, top + (height / source.height - 1) / 2],
        "inverse_center_contract": "native index = (input index + 0.5 - offset) / scale - 0.5; sample labels with nearest neighbor, never interpolate palette colors",
    }
    return background.convert("RGB"), transform


def build(repo: Path, output: Path, views: list[str], sizes: list[int], methods: list[str]) -> dict:
    manifest = json.loads((repo / "godot/modules/character-animation-workbench/masks/profiles.json").read_text(encoding="utf-8"))
    output.mkdir(parents=True, exist_ok=True)
    records = []
    for view in views:
        source, source_path = source_frame(repo, view)
        origin = output / "sources" / f"{view}.png"
        origin.parent.mkdir(parents=True, exist_ok=True)
        source.save(origin)
        profile = manifest["bindings"][view]["Layers/BodyBase"]
        if manifest["profiles"][profile]["transform"] != [1, 0, 0, 1, 0, 0]:
            raise ValueError(f"Body ownership registration is not identity for {view}; native mask projection must be reviewed")
        mask_path = repo / "godot/modules/character-animation-workbench/masks" / f"{profile}-owners.png"
        with Image.open(mask_path) as original_mask:
            mask = original_mask.convert("RGBA")
            if mask.size != source.size:
                raise ValueError(f"Review ownership mask does not align: {mask_path} {mask.size} != {source.size}")
            mask.putalpha(source.getchannel("A"))
        baseline = output / "baseline" / f"{view}-owners.png"
        baseline.parent.mkdir(parents=True, exist_ok=True)
        mask.save(baseline)
        for size in sizes:
            for method in methods:
                rendered, transform = make_input(source, size, method)
                destination = output / "model-inputs" / f"{view}-{method}-{size}.png"
                destination.parent.mkdir(parents=True, exist_ok=True)
                rendered.save(destination)
                records.append({
                    "view": view,
                    "input_file": str(destination.relative_to(output)).replace("\\", "/"),
                    "input_sha256": sha(destination),
                    "native_rgba_file": str(origin.relative_to(output)).replace("\\", "/"),
                    "native_rgba_sha256": sha(origin),
                    "source_atlas": str(source_path.relative_to(repo)).replace("\\", "/"),
                    "source_atlas_sha256": sha(source_path),
                    "reviewed_owner_mask": str(mask_path.relative_to(repo)).replace("\\", "/"),
                    "reviewed_owner_mask_sha256": sha(mask_path),
                    "baseline_file": str(baseline.relative_to(output)).replace("\\", "/"),
                    "baseline_sha256": sha(baseline),
                    **transform,
                })
                print("PREPARED", destination)
    report = {
        "schema": "hex-seethrough-probe/1",
        "purpose": "Read-only comparison of See-through / rig-c against reviewed source ownership",
        "sources": "first idle frame per independently authored Hex direction",
        "not_production": True,
        "records": records,
    }
    (output / "manifest.json").write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return report


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", type=Path, help="World of Hex checkout root; inferred from script location if installed in its tools/")
    parser.add_argument("--out", type=Path, help="Output directory (default: repo/tmp/animation-workbench/seethrough-probe)")
    parser.add_argument("--views", nargs="+", choices=ASSETS, default=["south-west", "south"])
    parser.add_argument("--sizes", nargs="+", type=int, default=[512, 768])
    parser.add_argument("--methods", nargs="+", choices=RESAMPLING, default=["nearest", "bicubic"])
    args = parser.parse_args()
    if any(size < 128 or size > 2048 for size in args.sizes):
        parser.error("size must be between 128 and 2048")
    repo = locate_repo(args.repo, Path(__file__))
    output = (args.out or repo / "tmp/animation-workbench/seethrough-probe").resolve()
    build(repo, output, list(dict.fromkeys(args.views)), list(dict.fromkeys(args.sizes)), list(dict.fromkeys(args.methods)))
    print("READY: " + str(output / "manifest.json"))
    print("Next: compare south-west bicubic/nearest 512 through local See-through with NF4 + CPU offload.")


if __name__ == "__main__":
    main()
