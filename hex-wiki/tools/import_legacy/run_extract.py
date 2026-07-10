#!/usr/bin/env python3
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

from clean_confluence_doc import convert_doc
from docx_to_markdown import convert_docx

DOWNLOADS = Path("/mnt/c/Users/Андрей/Downloads")
STAGE = ROOT / "staging"
STAGE.mkdir(parents=True, exist_ok=True)

DOC_MAP = {
    "Источники+и+герои.doc": "sources-and-heroes.md",
    "Палладия,+полисы+и+Могильник.doc": "palladia-poleis-mogilnik.md",
    "Империя+и+маноплато.doc": "empire-and-manoplateau.md",
    "Некрополис+и+эгрегоры.doc": "necropolis-and-egregores.md",
    "Серебристый+туман+и+магическая+экология.doc": "silver-mist-ecology.md",
    "Души,+туман+и+ядра.doc": "souls-mist-cores.md",
    "Мана+и+Изнанка.doc": "mana-and-inside.md",
    "Магическая+система+мира.doc": "magical-system.md",
}

for src_name, out_name in DOC_MAP.items():
    src = DOWNLOADS / src_name
    out = STAGE / out_name
    markdown = convert_doc(src)
    out.write_text(markdown + "\n", encoding="utf-8")
    print(f"OK {src_name} -> {out_name} ({len(markdown)} chars)")

docx = DOWNLOADS / "Консолидированный канон по сеттингу «Хекс».docx"
out = STAGE / "consolidated-canon.md"
markdown = convert_docx(docx)
out.write_text(markdown + "\n", encoding="utf-8")
print(f"OK consolidated docx -> consolidated-canon.md ({len(markdown)} chars)")
