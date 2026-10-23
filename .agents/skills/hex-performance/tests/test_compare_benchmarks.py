"""Offline, bounded tests for benchmark comparison. Run with unittest."""

import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "compare_benchmarks.py"
SPEC = importlib.util.spec_from_file_location("hex_performance_compare", SCRIPT)
COMPARER = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(COMPARER)


def manifest(samples, **overrides):
    data = {
        "schema": COMPARER.SCHEMA,
        "scenario": "fixed-frame",
        "environment": {"runtime": "Godot test binary", "workload": "one exact scene", "cache": "warm"},
        "metrics": {"frame_ms": {"unit": "ms", "direction": "lower", "samples": samples}},
    }
    data.update(overrides)
    return data


class ComparatorTests(unittest.TestCase):
    def test_expected_median_percent_change_and_worst(self):
        a, b = manifest([10, 20, 30, 40]), manifest([8, 16, 24, 32])
        out = COMPARER.compare(a, b)
        self.assertEqual(out["status"], "COMPARABLE_NUMERIC_ONLY")
        m = out["metrics"]["frame_ms"]
        self.assertEqual(m["baseline"]["p50"], 25)
        self.assertEqual(m["candidate"]["p95"], 32)
        self.assertEqual(m["candidate"]["worst_observed"], 32)
        self.assertAlmostEqual(m["median_change_pct"], -20)
        self.assertNotIn("PASS", str(out))

    def test_higher_preference_and_zero_baseline(self):
        a = manifest([0, 0], metrics={"throughput": {"unit": "ops/s", "direction": "higher", "samples": [0, 0]}})
        b = manifest([10], metrics={"throughput": {"unit": "ops/s", "direction": "higher", "samples": [10, 20]}})
        out = COMPARER.compare(a, b)
        self.assertIsNone(out["metrics"]["throughput"]["median_change_pct"])
        self.assertEqual(out["metrics"]["throughput"]["candidate"]["worst_observed"], 10)

    def test_workload_or_metric_mismatch_not_comparable(self):
        a = manifest([10])
        b = manifest([9], environment={"runtime": "different hardware"})
        self.assertEqual(COMPARER.compare(a, b)["status"], "NOT_COMPARABLE")
        b = manifest([9], metrics={"other": {"unit": "ms", "direction": "lower", "samples": [9]}})
        self.assertEqual(COMPARER.compare(a, b)["status"], "NOT_COMPARABLE")
        b = manifest([9], metrics={"frame_ms": {"unit": "ns", "direction": "lower", "samples": [9]}})
        self.assertEqual(COMPARER.compare(a, b)["status"], "NOT_COMPARABLE")

    def test_read_rejects_invalid_samples(self):
        invalid = ([], [float("nan")], [float("inf")], [-1], [True], ["10"], [1] * (COMPARER.MAX_SAMPLES_PER_METRIC + 1))
        with tempfile.TemporaryDirectory() as temp:
            file = Path(temp) / "input.json"
            for seq in invalid:
                file.write_text(json.dumps(manifest(seq)), encoding="utf-8")
                with self.assertRaises(COMPARER.InvalidManifest):
                    COMPARER.read_manifest(file)

    def test_read_does_not_modify_manifest(self):
        with tempfile.TemporaryDirectory() as temp:
            file = Path(temp) / "input.json"
            file.write_text(json.dumps(manifest([10.0, 13.0])) + "\n", encoding="utf-8")
            original = file.read_bytes()
            self.assertEqual(COMPARER.read_manifest(file)["scenario"], "fixed-frame")
            self.assertEqual(file.read_bytes(), original)

    def test_read_rejects_missing_metadata_and_large_file(self):
        with tempfile.TemporaryDirectory() as temp:
            file = Path(temp) / "input.json"
            data = manifest([10], environment={})
            file.write_text(json.dumps(data), encoding="utf-8")
            with self.assertRaises(COMPARER.InvalidManifest):
                COMPARER.read_manifest(file)
            file.write_bytes(b"x" * (COMPARER.MAX_INPUT_BYTES + 1))
            with self.assertRaises(COMPARER.InvalidManifest):
                COMPARER.read_manifest(file)


if __name__ == "__main__":
    unittest.main()
