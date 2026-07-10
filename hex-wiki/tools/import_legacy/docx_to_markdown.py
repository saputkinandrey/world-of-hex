#!/usr/bin/env python3
"""Convert DOCX files into Markdown using only the Python standard library."""

from __future__ import annotations

import argparse
import re
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

W_NS = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}


def paragraph_text(paragraph: ET.Element) -> str:
    return "".join(node.text or "" for node in paragraph.findall(".//w:t", W_NS)).strip()


def paragraph_style(paragraph: ET.Element) -> str:
    style = paragraph.find("./w:pPr/w:pStyle", W_NS)
    if style is None:
        return ""
    return style.attrib.get(f"{{{W_NS['w']}}}val", "")


def is_list_paragraph(paragraph: ET.Element) -> bool:
    return paragraph.find("./w:pPr/w:numPr", W_NS) is not None


def convert_docx(path: Path) -> str:
    with zipfile.ZipFile(path) as archive:
        document_xml = archive.read("word/document.xml")

    root = ET.fromstring(document_xml)
    lines: list[str] = []

    for paragraph in root.findall(".//w:p", W_NS):
        text = paragraph_text(paragraph)
        if not text:
            continue

        style = paragraph_style(paragraph).lower()
        heading_match = re.search(r"heading\s*([1-6])", style)
        if heading_match:
            level = int(heading_match.group(1))
            lines.append(f"{'#' * level} {text}")
            lines.append("")
            continue

        if is_list_paragraph(paragraph):
            lines.append(f"- {text}")
            continue

        lines.append(text)
        lines.append("")

    markdown = "\n".join(lines).strip()
    return re.sub(r"\n{3,}", "\n\n", markdown)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", type=Path, help="Path to .docx file")
    parser.add_argument(
        "-o",
        "--output",
        type=Path,
        help="Optional Markdown output path",
    )
    args = parser.parse_args()

    markdown = convert_docx(args.input)
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(markdown + "\n", encoding="utf-8")
    else:
        print(markdown)


if __name__ == "__main__":
    main()
