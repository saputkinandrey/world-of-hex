"""Bounded, read-only extraction of error contexts from one existing log.

Reads at most the final 2 MiB, emits capped JSON on stdout, writes no files.
"""

import argparse
import json
import re
from pathlib import Path

DEFAULT_MAX_BYTES = 2 * 1024 * 1024
MAX_BYTES_LIMIT = 8 * 1024 * 1024
MAX_EVENT_LIMIT = 20
MAX_CONTEXT_LIMIT = 3
MAX_LINE_CHARS = 400
EVENT = re.compile(r"\b(?:error|fatal|exception|traceback|failed|failure|panic|assertionerror)\b", re.IGNORECASE)


def extract(path: Path, max_bytes: int = DEFAULT_MAX_BYTES, max_events: int = 8, context: int = 2):
    if not 1 <= max_bytes <= MAX_BYTES_LIMIT:
        raise ValueError(f"max_bytes must be between 1 and {MAX_BYTES_LIMIT}")
    if not 1 <= max_events <= MAX_EVENT_LIMIT:
        raise ValueError(f"max_events must be between 1 and {MAX_EVENT_LIMIT}")
    if not 0 <= context <= MAX_CONTEXT_LIMIT:
        raise ValueError(f"context must be between 0 and {MAX_CONTEXT_LIMIT}")
    path = path.resolve(strict=True)
    if not path.is_file():
        raise ValueError("input must be an existing regular file")

    size = path.stat().st_size
    start_byte = max(0, size - max_bytes)
    with path.open("rb") as fh:
        fh.seek(start_byte)
        data = fh.read(max_bytes)
    text = data.decode("utf-8", errors="replace")

    # When reading only the tail, discard the first potentially incomplete line.
    if start_byte:
        newline = text.find("\n")
        text = text[newline + 1:] if newline != -1 else ""
    lines = text.splitlines()
    hits = [i for i, line in enumerate(lines) if EVENT.search(line)]
    chosen = hits[-max_events:]
    selected = set()
    for i in chosen:
        selected.update(range(max(0, i - context), min(len(lines), i + context + 1)))

    excerpts = []
    for i in sorted(selected):
        line = lines[i]
        clipped = len(line) > MAX_LINE_CHARS
        excerpts.append({
            "line_in_scanned_text": i + 1,
            "matched": i in chosen,
            "text": line[:MAX_LINE_CHARS] + (" [LINE TRUNCATED]" if clipped else ""),
        })
    return {
        "schema": "hex-debugging-log/1",
        "input": str(path),
        "file_size_bytes": size,
        "read_from_byte": start_byte,
        "tail_truncated": start_byte > 0,
        "scanned_lines": len(lines),
        "matching_lines_in_scanned_text": len(hits),
        "shown_events": len(chosen),
        "excerpts": excerpts,
        "note": "This scan is only a keyword-based excerpt, not proof of root cause. Review for secrets before sharing.",
    }


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--input", required=True, type=Path, help="existing log file")
    ap.add_argument("--max-bytes", type=int, default=DEFAULT_MAX_BYTES)
    ap.add_argument("--max-events", type=int, default=8)
    ap.add_argument("--context", type=int, default=2)
    args = ap.parse_args()
    print(json.dumps(extract(args.input, args.max_bytes, args.max_events, args.context), indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
