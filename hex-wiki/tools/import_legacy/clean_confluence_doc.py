#!/usr/bin/env python3
"""Convert Confluence MIME .doc exports into Markdown."""

from __future__ import annotations

import argparse
import html
import re
from email import policy
from email.parser import BytesParser
from pathlib import Path


def extract_html_from_doc(path: Path) -> str:
    message = BytesParser(policy=policy.default).parsebytes(path.read_bytes())
    for part in message.walk():
        if part.get_content_type() != "text/html":
            continue
        payload = part.get_payload(decode=True) or b""
        charset = part.get_content_charset() or "utf-8"
        return payload.decode(charset, errors="replace")
    raise ValueError(f"No text/html part found in {path}")


def strip_tags(value: str) -> str:
    text = re.sub(r"<[^>]+>", "", value)
    return html.unescape(re.sub(r"\s+", " ", text)).strip()


def html_to_markdown(raw_html: str) -> str:
    text = raw_html
    text = re.sub(r"(?is)<script[^>]*>.*?</script>", "", text)
    text = re.sub(r"(?is)<style[^>]*>.*?</style>", "", text)
    text = re.sub(r"(?is)<!--.*?-->", "", text)

    title_match = re.search(r"(?is)<title>(.*?)</title>", text)
    title = strip_tags(title_match.group(1)) if title_match else ""

    body_match = re.search(r"(?is)<body[^>]*>(.*?)</body>", text)
    body = body_match.group(1) if body_match else text

    body = re.sub(r"(?is)<br\s*/?>", "\n", body)
    body = re.sub(r"(?is)</p\s*>", "\n\n", body)
    body = re.sub(r"(?is)</div\s*>", "\n", body)
    body = re.sub(r"(?is)</tr\s*>", "\n", body)
    body = re.sub(r"(?is)</li\s*>", "\n", body)

    for level in range(1, 7):
        body = re.sub(
            rf"(?is)<h{level}[^>]*>(.*?)</h{level}>",
            lambda match, lvl=level: f"\n{'#' * lvl} {strip_tags(match.group(1))}\n\n",
            body,
        )

    body = re.sub(
        r"(?is)<li[^>]*>(.*?)</?li>",
        lambda match: f"- {strip_tags(match.group(1))}\n",
        body,
    )
    body = re.sub(
        r"(?is)<(?:strong|b)[^>]*>(.*?)</(?:strong|b)>",
        lambda match: f"**{strip_tags(match.group(1))}**",
        body,
    )
    body = re.sub(
        r"(?is)<(?:em|i)[^>]*>(.*?)</(?:em|i)>",
        lambda match: f"*{strip_tags(match.group(1))}*",
        body,
    )
    body = re.sub(
        r"(?is)<a[^>]*href=['\"]([^'\"]+)['\"][^>]*>(.*?)</a>",
        lambda match: f"[{strip_tags(match.group(2))}]({match.group(1)})",
        body,
    )

    body = re.sub(r"(?is)<[^>]+>", "", body)
    body = html.unescape(body)
    body = body.replace("\r\n", "\n").replace("\r", "\n")
    body = re.sub(r"[ \t]+\n", "\n", body)
    body = re.sub(r"\n{3,}", "\n\n", body).strip()

    if title and not body.startswith("# "):
        body = f"# {title}\n\n{body}"
    return body


def convert_doc(path: Path) -> str:
    return html_to_markdown(extract_html_from_doc(path))


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", type=Path, help="Path to Confluence .doc export")
    parser.add_argument(
        "-o",
        "--output",
        type=Path,
        help="Optional Markdown output path",
    )
    args = parser.parse_args()

    markdown = convert_doc(args.input)
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(markdown + "\n", encoding="utf-8")
    else:
        print(markdown)


if __name__ == "__main__":
    main()
