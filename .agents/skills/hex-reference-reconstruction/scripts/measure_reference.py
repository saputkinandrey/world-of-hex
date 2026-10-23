"""Read-only, bounded measurements from a source image and explicit regions.

Requires Pillow. Prints JSON on stdout; no output images or files are written.
No automatic background segmentation or semantic landmark detection is performed.
"""

import argparse
from collections import Counter
import hashlib
import json
import math
from pathlib import Path
from PIL import Image

MAX_PIXELS = 4_194_304
MAX_REGIONS = 32
MAX_TOTAL_REGION_PIXELS = 16_777_216
MAX_PALETTE_SAMPLES = 4096
MAX_JSON_BYTES = 32_768
ALPHA_THRESHOLD = 0
MASK_THRESHOLD = 127


def _sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def _read_regions(path, image_size):
    if path is None:
        return [{"name": "full", "box": [0, 0, *image_size]}]
    path = Path(path)
    if path.stat().st_size > MAX_JSON_BYTES:
        raise ValueError("Region JSON exceeds size limit")
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, dict) or not isinstance(data.get("regions"), list):
        raise ValueError("Region JSON needs a 'regions' list")
    regions = data["regions"]
    if not 1 <= len(regions) <= MAX_REGIONS:
        raise ValueError(f"Expected 1..{MAX_REGIONS} regions")
    names = set()
    area = 0
    w, h = image_size
    for r in regions:
        if not isinstance(r, dict) or not isinstance(r.get("name"), str) or not r["name"].strip():
            raise ValueError("Each region needs a nonempty name")
        if r["name"] in names:
            raise ValueError("Duplicate region name")
        names.add(r["name"])
        box = r.get("box")
        if not (isinstance(box, list) and len(box) == 4 and all(type(v) is int for v in box)):
            raise ValueError("Each region box must be [x0, y0, x1, y1] integers")
        x0, y0, x1, y1 = box
        if not (0 <= x0 < x1 <= w and 0 <= y0 < y1 <= h):
            raise ValueError("Region box outside source canvas or empty")
        area += (x1 - x0) * (y1 - y0)
    if area > MAX_TOTAL_REGION_PIXELS:
        raise ValueError("Total selected region area exceeds limit")
    return regions


def _palette(pixels, selector, width, height):
    """Deterministic subset of visible pixels; counts are approximate, not whole-image exact."""
    stride = max(1, math.ceil(math.sqrt((width * height) / MAX_PALETTE_SAMPLES)))
    rgb = pixels.load()
    selected = selector.load() if selector is not None else None
    count = Counter()
    for y in range(0, height, stride):
        for x in range(0, width, stride):
            if selected is not None and selected[x, y] <= 0:
                continue
            red, green, blue, _alpha = rgb[x, y]
            count[(red, green, blue)] += 1
    n = sum(count.values())
    return {
        "sample_spacing_px": stride,
        "sampled_pixels": n,
        "colors": [
            {
                "hex": "#%02X%02X%02X" % rgb,
                "sample_count": quantity,
                "sample_fraction": quantity / n,
            }
            for rgb, quantity in sorted(count.items(), key=lambda p: (-p[1], p[0]))[:8]
        ] if n else [],
    }


def inspect(image_path, regions_path=None, mask_path=None):
    image_path = Path(image_path)
    with Image.open(image_path) as opened:
        size = opened.size
        if size[0] * size[1] > MAX_PIXELS:
            raise ValueError("Source image exceeds pixel limit")
        if size[0] <= 0 or size[1] <= 0:
            raise ValueError("Source image has no pixels")
        has_alpha = opened.mode in ("RGBA", "LA") or "transparency" in opened.info
        rgba = opened.convert("RGBA")
    regions = _read_regions(regions_path, size)
    selection = None
    selection_type = "none"
    if mask_path is not None:
        with Image.open(mask_path) as opened:
            if opened.size != size:
                raise ValueError("Explicit mask must match original canvas dimensions")
            selection = opened.convert("L").point(lambda v: 255 if v > MASK_THRESHOLD else 0)
        selection_type = "explicit mask"
    elif has_alpha:
        alpha = rgba.getchannel("A")
        if alpha.getextrema()[0] < 255:
            selection = alpha.point(lambda v: 255 if v > ALPHA_THRESHOLD else 0)
            selection_type = "source alpha > 0"

    result = {
        "schema": "hex-reference-measurement/1",
        "source": {"path": str(image_path.resolve()), "sha256": _sha256(image_path)},
        "canvas_px": list(size),
        "foreground_source": selection_type,
        "regions": [],
        "note": "Regions are supplied, not detected. Coordinates and bounds remain in the source canvas.",
    }
    if mask_path is not None:
        result["mask"] = {"path": str(Path(mask_path).resolve()), "sha256": _sha256(mask_path)}

    for region in regions:
        name = region["name"]
        box = region["box"]
        x0, y0, x1, y1 = box
        crop = rgba.crop(box)
        selected = selection.crop(box) if selection is not None else None
        bounds = selected.getbbox() if selected is not None else None
        foreground = {
            "pixel_count": sum(selected.histogram()[1:]),
            "bbox_source": [bounds[0] + x0, bounds[1] + y0, bounds[2] + x0, bounds[3] + y0] if bounds else None,
        } if selected is not None else None
        pal = _palette(crop, selected, x1 - x0, y1 - y0)
        result["regions"].append({
            "name": name,
            "box_source": box,
            "size_px": [x1 - x0, y1 - y0],
            "foreground": foreground,
            "palette_scope": selection_type if selection is not None else "whole rectangle (includes background)",
            "palette_sample": pal,
        })
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--image", required=True, type=Path)
    parser.add_argument("--regions", type=Path)
    parser.add_argument("--mask", type=Path)
    args = parser.parse_args()
    try:
        report = inspect(args.image, args.regions, args.mask)
    except (ValueError, OSError, json.JSONDecodeError) as exc:
        parser.exit(2, f"Invalid reference: {exc}\n")
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
