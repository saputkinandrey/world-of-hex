# Domain Admin Agent Instructions

## General
- Keep changes scoped to `domain-admin/` unless root workspace scripts must change.
- Preserve the domain admin as a standalone app that can run without backend services.
- Keep source-derived constants auditable and close to the calculations that use them.

## Frontend
- Use MUI for UI work.
- Keep operational admin screens dense, scan-friendly, and explicit about source quality.
- Do not hide unresolved specification gaps; surface them in the audit view.
