"""Single-pass aligned PNG comparison for World of Hex visuals.

Requires Pillow and NumPy. Does not change, resize, or align source images.
"""

import argparse
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

MAX_PIXELS = 8_388_608  # Up to 4K screenshots; reject oversized jobs explicitly.
MASK_THRESHOLD = 128


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def load(path):
    with Image.open(path) as im:
        if im.width * im.height > MAX_PIXELS:
            raise ValueError(f"Image exceeds {MAX_PIXELS} pixels: {path}")
        rgba = np.asarray(im.convert("RGBA"), dtype=np.uint8).copy()
        has_partial_alpha = ("A" in im.getbands() or "transparency" in im.info) and bool(np.any(rgba[..., 3] < 255))
    return rgba, has_partial_alpha


def read_mask(path, shape):
    with Image.open(path) as im:
        if (im.height, im.width) != shape:
            raise ValueError(f"Mask dimensions differ from image: {path}")
        if "A" in im.getbands() and im.getextrema()[-1][0] < 255:
            values = np.asarray(im.getchannel("A"), dtype=np.uint8)
        else:
            values = np.asarray(im.convert("L"), dtype=np.uint8)
    return values > MASK_THRESHOLD


def compare(reference_path, candidate_path, out_dir, reference_mask=None, candidate_mask=None):
    reference_path = Path(reference_path).resolve()
    candidate_path = Path(candidate_path).resolve()
    out_dir = Path(out_dir).resolve()
    if (reference_mask is None) != (candidate_mask is None):
        raise ValueError("Specify both --reference-mask and --candidate-mask, or neither")
    if out_dir.exists() and any(out_dir.iterdir()):
        raise ValueError(f"Output directory is not empty: {out_dir}; no files overwritten")

    ref, ref_alpha = load(reference_path)
    cand, cand_alpha = load(candidate_path)
    if ref.shape != cand.shape:
        raise ValueError(f"Image sizes differ: {ref.shape[:2]} vs {cand.shape[:2]}; no auto-resize")

    height, width = ref.shape[:2]
    # Ignore invisible RGB in fully transparent pixels; preserve differences in alpha.
    def premultiplied(rgba):
        values = rgba.astype(np.float32)
        values[..., :3] *= values[..., 3:4] / 255.0
        return values

    diff = np.abs(premultiplied(ref) - premultiplied(cand))
    maxima = diff.max(axis=2)
    changed = maxima > 0.5
    report = {
        "schema": "hex-visual-comparison/1",
        "reference": {"path": str(reference_path), "sha256": digest(reference_path)},
        "candidate": {"path": str(candidate_path), "sha256": digest(candidate_path)},
        "native_size": [width, height],
        "alignment": "same pixel coordinates; no resizing, recentering or registration",
        "pixel_difference": {
            "changed_pixels": int(changed.sum()),
            "total_pixels": width * height,
            "changed_fraction": float(changed.mean()),
            "mean_absolute_premultiplied_rgba": float(diff.mean()),
            "maximum_channel_difference": float(diff.max()),
        },
    }

    m1 = m2 = None
    if reference_mask is not None:
        m1 = read_mask(reference_mask, (height, width))
        m2 = read_mask(candidate_mask, (height, width))
        mask_source = "explicit masks"
    elif ref_alpha and cand_alpha:
        m1 = ref[..., 3] > MASK_THRESHOLD
        m2 = cand[..., 3] > MASK_THRESHOLD
        mask_source = f"source alpha > {MASK_THRESHOLD}"

    if m1 is not None:
        intersection = int((m1 & m2).sum())
        union = int((m1 | m2).sum())
        report["silhouette"] = {
            "source": mask_source,
            "reference_pixels": int(m1.sum()),
            "candidate_pixels": int(m2.sum()),
            "intersection_pixels": intersection,
            "union_pixels": union,
            "iou": (intersection / union if union else None),
            "reference_only_pixels": int((m1 & ~m2).sum()),
            "candidate_only_pixels": int((m2 & ~m1).sum()),
            "both_masks_empty": union == 0,
        }
    else:
        report["silhouette"] = None
        report["silhouette_note"] = "Explicit masks required: both images must carry meaningful alpha for automatic IoU."

    def display(rgba):
        alpha = rgba[..., 3:4].astype(np.float32) / 255.0
        background = np.array([31, 34, 41], dtype=np.float32)
        return (rgba[..., :3].astype(np.float32) * alpha + background * (1 - alpha)).astype(np.uint8)

    gap, header = 8, 24
    sheet = Image.new("RGB", (width * 3 + gap * 2, height + header), (17, 19, 24))
    sheet.paste(Image.fromarray(display(ref)), (0, header))
    sheet.paste(Image.fromarray(display(cand)), (width + gap, header))
    if m1 is not None:
        overlay = np.zeros((height, width, 3), dtype=np.uint8)
        overlay[m1 & m2] = [235, 235, 235]
        overlay[m1 & ~m2] = [238, 70, 70]
        overlay[~m1 & m2] = [70, 204, 228]
        label = "MASK: BOTH=WHITE REF=RED TEST=CYAN"
    else:
        # Red heat indicates the *actual* per-pixel numerical difference.
        intensity = np.clip(maxima, 0, 255).astype(np.uint8)
        overlay = np.zeros((height, width, 3), dtype=np.uint8)
        overlay[..., 0] = intensity
        overlay[..., 1] = intensity // 5
        label = "PIXEL DELTA (RED)"
    sheet.paste(Image.fromarray(overlay), (2 * (width + gap), header))
    draw = ImageDraw.Draw(sheet)
    draw.text((5, 5), "REFERENCE", fill=(240, 240, 240))
    draw.text((width + gap + 5, 5), "CANDIDATE", fill=(240, 240, 240))
    draw.text((2 * (width + gap) + 5, 5), label, fill=(240, 240, 240))

    out_dir.mkdir(parents=True, exist_ok=True)
    sheet.save(out_dir / "comparison.png")
    (out_dir / "comparison.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--reference", required=True, type=Path)
    parser.add_argument("--candidate", required=True, type=Path)
    parser.add_argument("--out-dir", required=True, type=Path)
    parser.add_argument("--reference-mask", type=Path)
    parser.add_argument("--candidate-mask", type=Path)
    args = parser.parse_args()
    result = compare(args.reference, args.candidate, args.out_dir, args.reference_mask, args.candidate_mask)
    print(json.dumps({"report": str(args.out_dir / "comparison.json"), "pixel_difference": result["pixel_difference"], "silhouette": result["silhouette"]}, indent=2))


if __name__ == "__main__":
    main()
