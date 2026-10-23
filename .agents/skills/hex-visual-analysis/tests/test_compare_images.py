import importlib.util
import tempfile
import unittest
from pathlib import Path

import numpy as np
from PIL import Image

SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "compare_images.py"
spec = importlib.util.spec_from_file_location("hex_visual_compare", SCRIPT)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class ImageComparisonTests(unittest.TestCase):
    def test_aligned_alpha_masks_detect_one_pixel_shift(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            a = np.zeros((4, 4, 4), dtype=np.uint8)
            b = np.zeros_like(a)
            a[1:3, 1:3] = [220, 100, 80, 255]
            b[1:3, 2:4] = [220, 100, 80, 255]
            Image.fromarray(a).save(root / "a.png")
            Image.fromarray(b).save(root / "b.png")
            report = module.compare(root / "a.png", root / "b.png", root / "out")
            self.assertAlmostEqual(report["silhouette"]["iou"], 2 / 6)
            self.assertEqual(report["pixel_difference"]["changed_pixels"], 4)
            self.assertTrue((root / "out" / "comparison.png").is_file())

    def test_identical_inputs_have_zero_difference(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            Image.new("RGB", (8, 5), "#123456").save(root / "source.png")
            report = module.compare(root / "source.png", root / "source.png", root / "out")
            self.assertEqual(report["pixel_difference"]["changed_pixels"], 0)
            self.assertIsNone(report["silhouette"])

    def test_explicit_masks_on_opaque_screenshot(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            Image.new("RGB", (4, 4), "white").save(root / "source.png")
            Image.new("RGB", (4, 4), "white").save(root / "other.png")
            im = Image.new("L", (4, 4), 0)
            im.putpixel((0, 0), 255)
            im.save(root / "ma.png")
            im = Image.new("L", (4, 4), 0)
            im.putpixel((1, 0), 255)
            im.save(root / "mb.png")
            report = module.compare(root / "source.png", root / "other.png", root / "out", root / "ma.png", root / "mb.png")
            self.assertEqual(report["silhouette"]["iou"], 0)

    def test_refuses_existing_nonempty_output_and_different_sizes(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            Image.new("RGB", (4, 4)).save(root / "a.png")
            Image.new("RGB", (5, 4)).save(root / "b.png")
            with self.assertRaisesRegex(ValueError, "sizes differ"):
                module.compare(root / "a.png", root / "b.png", root / "out")
            (root / "out").mkdir()
            (root / "out" / "do-not-overwrite.txt").write_text("leave me")
            with self.assertRaisesRegex(ValueError, "not empty"):
                module.compare(root / "a.png", root / "a.png", root / "out")
            self.assertEqual((root / "out" / "do-not-overwrite.txt").read_text(), "leave me")


if __name__ == "__main__":
    unittest.main()
