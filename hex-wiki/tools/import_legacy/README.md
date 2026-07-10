# Legacy Import Tools

Инструменты импорта legacy-материалов в Hex Wiki.

## Цель

- старые `.doc` Confluence export -> cleaned Markdown;
- DOCX -> Markdown;
- legacy-материалы можно складывать в `wiki/sources/legacy-confluence/`;
- актуальные статьи вручную переносить в `wiki/canon/`.

## Скрипты

- `clean_confluence_doc.py` — разбор MIME `.doc`, извлечение HTML, конвертация в Markdown.
- `docx_to_markdown.py` — конвертация DOCX в Markdown через stdlib (`zipfile` + XML).
- `run_extract.py` — пакетный прогон исходников из Downloads в `staging/`.

## Пример

```bash
python3 hex-wiki/tools/import_legacy/clean_confluence_doc.py path/to/export.doc -o staging/out.md
python3 hex-wiki/tools/import_legacy/docx_to_markdown.py path/to/file.docx -o staging/out.md
python3 hex-wiki/tools/import_legacy/run_extract.py
```

## Workflow

1. Положить исходный файл в доступную директорию.
2. Запустить соответствующий скрипт.
3. Проверить результат в `staging/`.
4. Перенести подтверждённый канон в `wiki/canon/`.
5. При конфликте со старым текстом зафиксировать решение в `wiki/meta/conflicts.md`.
6. Записать импорт в `wiki/meta/import-log.md`.

## Ограничения

- нет автоматического разрешения конфликтов;
- DOCX с консолидированным каноном не должен становиться отдельной wiki-страницей без явного решения;
- HTML-конвертер упрощённый: сложные таблицы и Confluence macros могут требовать ручной правки.
