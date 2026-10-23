"""Offline tests for bounded reference measurement. Run: python -m unittest discover ..."""

import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from PIL import Image

SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "measure_reference.py"
SPEC = importlib.util.spec_from_file_location("measure_reference_hex", SCRIPT)
MEASURE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MEASURE)


class InspectReferenceTests(unittest.TestCase):
    def test_alpha_bounds_in_original_coordinates(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            source = Image.new("RGBA", (8, 6), (0, 0, 0, 0))
            for y in (2, 3):
                for x in (3, 4):
                    source.putpixel((x, y), (255, 0, 10, 255))
            source.save(root / "a.png")
            regions = {"regions": [{"name": "face", "box": [2, 1, 6, 5]}]}
            (root / "regions.json").write_text(json.dumps(regions), encoding="utf-8")
            result = MEASURE.inspect(root / "a.png", root / "regions.json")
            r = result["regions"][0]
            self.assertEqual(r["foreground"]["pixel_count"], 4)
            self.assertEqual(r["foreground"]["bbox_source"], [3, 2, 5, 4])
            self.assertEqual(r["palette_sample"]["colors"][0]["hex"], "#FF000A")
            self.assertEqual(result["foreground_source"], "source alpha > 0")

    def test_opaque_avoids_background_guessing(self):
        with tempfile.TemporaryDirectory() as tmp:
            file = Path(tmp) / "a.png"
            Image.new("RGB", (5, 7), "white").save(file)
            value = MEASURE.inspect(file)
            self.assertEqual(value["foreground_source"], "none")
            self.assertIsNone(value["regions"][0]["foreground"])
            self.assertIn("includes background", value["regions"][0]["palette_scope"])

    def test_explicit_mask_preserves_coordinates(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            Image.new("RGB", (4, 4), "red").save(root / "ref.png")
            m = Image.new("L", (4, 4), 0)
            m.putpixel((3, 1), 255)
            m.save(root / "mask.png")
            report = MEASURE.inspect(root / "ref.png", mask_path=root / "mask.png")
            self.assertEqual(report["regions"][0]["foreground"]["pixel_count"], 1)
            self.assertEqual(report["regions"][0]["foreground"]["bbox_source"], [3, 1, 4, 2])

    def test_rejects_out_of_bounds_regions_and_duplicate_names(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            Image.new("RGB", (8, 8)).save(root / "ref.png")
            for regs in (
                [{"name": "x", "box": [0, 0, 9, 2]}],
                [{"name": "x", "box": [1, 1, 1, 2]}],
                [{"name": "x", "box": [0, 0, 2, 2]}, {"name": "x", "box": [3, 3, 4, 4]}],
                [{"name": "x", "box": [True, 0, 4, 4]}],
            ):
                (root / "regions.json").write_text(json.dumps({"regions": regs}), encoding="utf-8")
                with self.assertRaises(ValueError):
                    MEASURE.inspect(root / "ref.png", root / "regions.json")

    def test_rejects_wrong_mask_dimensions(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            Image.new("RGB", (4, 4)).save(root / "ref.png")
            Image.new("L", (2, 2)).save(root / "mask.png")
            with self.assertRaises(ValueError):
                MEASURE.inspect(root / "ref.png", mask_path=root / "mask.png")

    def test_read_only(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            Image.new("RGBA", (8, 8), (70, 60, 50, 180)).save(root / "ref.png")
            original = (root / "ref.png").read_bytes()
            before = sorted(p.name for p in root.iterdir())
            MEASURE.inspect(root / "ref.png")
            self.assertEqual((root / "ref.png").read_bytes(), original)
            self.assertEqual(sorted(p.name for p in root.iterdir()), before)


if __name__ == "__main__":
    unittest.main()
