# Project Agent Instructions

## General
- Prefer concise changes; keep public APIs minimal.
- Default to ASCII in new content.
- Always run Prettier after backend changes (use the project's formatter even for small edits).
- Nested `AGENTS.md` apply to their subtree and override this file on conflicts.



## Cleanup
- Do not delete legacy files unless explicitly requested.
- Legacy files are kept for reference; avoid editing them unless asked.
- Legacy files live under `__*` folders or use `__*` prefixes.
- Keep domain entities free from infrastructure concerns (streams/guards live in base classes).
