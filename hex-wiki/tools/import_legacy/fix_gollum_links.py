#!/usr/bin/env python3
"""Flip Gollum wiki-links from [[path|label]] to [[label|path]]."""

from __future__ import annotations

import re
from pathlib import Path

WIKI = Path(__file__).resolve().parents[2] / "wiki"
LINK_RE = re.compile(r"\[\[([^\]|]+)\|([^\]]+)\]\]")


def flip(match: re.Match[str]) -> str:
    left, right = match.group(1).strip(), match.group(2).strip()
    # Already label|path if left has no slash and right looks like a path
    left_is_path = "/" in left or left.endswith("Index") or left in {"Home"}
    right_is_path = "/" in right or right.endswith("Index") or right in {"Home"}
    if left_is_path and not right_is_path:
        path = left if left.startswith("/") or left == "Home" else f"/{left}"
        if left == "Home":
            path = "Home"
        return f"[[{right}|{path}]]"
    if right_is_path and not left_is_path:
        path = right if right.startswith("/") or right == "Home" else f"/{right}"
        if right == "Home":
            path = "Home"
        return f"[[{left}|{path}]]"
    return match.group(0)


changed = 0
for path in WIKI.rglob("*.md"):
    original = path.read_text(encoding="utf-8")
    updated = LINK_RE.sub(flip, original)
    if updated != original:
        path.write_text(updated, encoding="utf-8")
        changed += 1
        print(f"updated {path.relative_to(WIKI)}")

print(f"files changed: {changed}")
