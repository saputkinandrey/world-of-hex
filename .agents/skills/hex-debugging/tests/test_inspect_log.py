"""Offline checks for the bounded log inspection utility."""

import importlib.util
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "inspect_log.py"
SPEC = importlib.util.spec_from_file_location("hex_debug_log", SCRIPT)
LOG = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(LOG)


class LogInspectorTests(unittest.TestCase):
    def test_bounded_context_and_final_events(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "run.log"
            path.write_text("ok\nERROR first\ntrace\nfine\nERROR second\nend\n", encoding="utf-8")
            result = LOG.extract(path, max_events=1, context=1)
            self.assertEqual(result["matching_lines_in_scanned_text"], 2)
            self.assertEqual(result["shown_events"], 1)
            self.assertEqual([x["text"] for x in result["excerpts"]], ["fine", "ERROR second", "end"])
            self.assertEqual([x["matched"] for x in result["excerpts"]], [False, True, False])

    def test_no_keyword_hit_is_not_claimed_success(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "run.log"
            path.write_text("all entries informational\nnothing to report\n", encoding="utf-8")
            result = LOG.extract(path)
            self.assertEqual(result["matching_lines_in_scanned_text"], 0)
            self.assertEqual(result["excerpts"], [])
            self.assertIn("not proof of root cause", result["note"])

    def test_limits_reject_unbounded_requests(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "run.log"
            path.write_text("ERROR", encoding="utf-8")
            for kwargs in (
                {"max_events": 21},
                {"max_events": 0},
                {"max_bytes": 0},
                {"max_bytes": LOG.MAX_BYTES_LIMIT + 1},
                {"context": 4},
            ):
                with self.assertRaises(ValueError):
                    LOG.extract(path, **kwargs)

    def test_long_lines_clipped(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "run.log"
            path.write_text("ERROR " + "x" * 800 + "\n", encoding="utf-8")
            result = LOG.extract(path, context=0)
            self.assertEqual(len(result["excerpts"]), 1)
            self.assertIn("[LINE TRUNCATED]", result["excerpts"][0]["text"])

    def test_tail_truncation_discards_partial_first_line(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "run.log"
            path.write_text(("x" * 1000) + "\nERROR relevant\n", encoding="utf-8")
            result = LOG.extract(path, max_bytes=40, context=0)
            self.assertTrue(result["tail_truncated"])
            self.assertEqual([x["text"] for x in result["excerpts"]], ["ERROR relevant"])

    def test_does_not_modify_input(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "run.log"
            path.write_bytes(b"ok\nERROR no change\n")
            before = path.read_bytes()
            LOG.extract(path)
            self.assertEqual(path.read_bytes(), before)


if __name__ == "__main__":
    unittest.main()
