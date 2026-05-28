# Project Agent Instructions

## General
- Prefer concise changes; keep public APIs minimal.
- Default to ASCII in new content.
- Always run Prettier after backend changes (use the project's formatter even for small edits).
- Nested `AGENTS.md` apply to their subtree and override this file on conflicts.
- Treat commands starting with `docker compose` as pre-approved local workflow for this project; do not stop to ask for permission before running them.
- For repeated local tooling, prefer stable wrapper commands such as fixed `npm run ...` aliases over long ad-hoc shell commands.
- When shell tooling needs dynamic input, prefer reading it from repo-local files rather than embedding long changing arguments directly in the command line.

## Agent Tooling Workflow
- Prefer stable repo-local wrappers for repeated local operations so command prefixes stay short and reusable.
- Prefer commands such as `npm run mongo:query`, `npm run docker:logs:api`, `npm run docker:logs:mongo`, and `npm run docker:up` over long inline `docker compose ...` or `mongosh --eval ...` commands.
- When a local query or script needs changing input, put that input into repo-local files instead of passing it as changing shell arguments.
- For Mongo inspection in `backend`, keep the query body in `backend/tmp/mongo-query.js` and optional database name in `backend/tmp/mongo-query.database.txt`, then run the stable wrapper `npm run mongo:query`.
- Prefer adding a new fixed wrapper command over repeatedly inventing new long shell commands for the same local workflow.

## Project Sources
- Treat `project-sources/roleplaying-systems.xlsx` as an important project data source. It contains multiple roleplaying systems planned for future implementation in this project.
- Treat `project-sources/culinary-system-world-of-hex.docx` as an important project data source for the culinary system in the World of Hex setting.
- When a task touches mechanics covered by these files, inspect the relevant source before assessing or implementing behavior.

## SOW Feature Assessment
- Use strict status mapping: `done`, `partial`, `not done`.
- Do not invent requirements that are not explicitly present in SOW text.
- Do not downgrade status because of best-practice gaps such as missing tests.
- Missing tests must be reported as an improvement opportunity, not as a blocker for feature completion.
- Determine status by feature outcome first, not by presence of technical pieces.
- If required outcome is not achieved, status must be `not done` even when there is existing code.
- If key feature behavior is not usable end-to-end, status must be `not done`.
- If existing code is only incidental scaffolding from other features and does not implement the feature goal, status must be `not done`.
- Use `partial` only when required feature behavior exists in a truly usable subset of SOW scope.
- `partial` is valid only when at least one explicit SOW scenario works correctly in a production-like flow.
- Do not assign `partial` for scaffolding, internal helpers, or dead paths without a usable scenario.
- Scenario coverage drives status: some required scenarios working and some missing means `partial`; no working required scenarios means `not done`.
- Evaluate only against explicit requirement wording.
- Separate clearly implemented requirement behavior, non-blocking improvements, and missing required behavior.
- Do not mix unrelated module capabilities into feature completion evidence.
- For each assessed feature, report status, what matches requirement text, and what is missing from requirement text.
- Do not use broad partial-implementation labels without concrete required-behavior mapping.

## Code Style
- Do not use inline object types in function parameters or return types.
- Always extract object shapes into named `type` or `interface` declarations.
- Exception: an inline object type is allowed for a function parameter only when that parameter is immediately destructured in the function signature.
- Avoid magic constants when a domain enum, named constant, shared config value, or other explicit identifier already exists.
- If no explicit identifier exists, usually introduce one when it improves clarity or reuse, but avoid needless abstractions for one-off obvious values.

## Scope Discipline
- Avoid scope expansion beyond the current task.
- For every new task, always start with investigation only.
- Do not modify code until the user explicitly allows implementation for that specific task context.
- Scope-first: if the user marks behavior as out of scope or unsupported, do not add logic branches or tests for it.
- User intent overrides inferred best practice when they conflict.
- Single-step correction: after user correction, move directly to the requested final behavior without intermediate alternatives.
- You may enrich repo-local Markdown documentation files such as `AGENTS.md`, `README.md`, and `ROADMAP.md` without asking for permission first when doing so preserves or improves project clarity.
- Ask for permission before changing Markdown documentation in a way that would remove information, reduce detail, or weaken previously recorded constraints.

## Implementation Discipline
- Do not suppress errors: do not swallow exceptions, replace original failures with generic ones, or log without preserving actionable error context unless explicitly requested.
- Mandatory SRP: every class and method must have a single clear responsibility.
- Minimal delta: apply the smallest change set that fixes the stated defect; avoid "while we are here" additions.
- Do not add meaningless code: no no-op assignments, redundant parameter passing, unused branches, or changes without real behavioral or structural benefit.
- Before changing any shared helper, shared service method, repository method, or other reused code path, first identify all known call sites and determine whether the behavior change is intended for all of them or only for one specific scenario.
- If a defect affects one concrete user flow, endpoint, screen, job, or command, default to fixing it at the narrowest entrypoint for that flow.
- Do not delete or weaken existing shared logic to fix a single-scenario bug until verifying that the logic is not required by any other caller.
- For bug fixes, prefer a localized and explicit guard, flag, or wrapper over broader behavioral changes in shared code when the broader change is not clearly required.
- Finding the root cause inside shared code does not by itself justify changing shared behavior; first determine the intended blast radius of the fix.
- Before implementing potentially ambiguous logic, confirm the intended behavior in one concise statement.
- Before implementing a bug fix, state in one concise sentence which exact scenario must change and which related scenarios must remain unchanged.
- If a method is used by multiple flows with different semantics, do not hide scenario-specific bypasses inside the shared abstraction; apply them at the specific call site or entrypoint that needs the exception.
- In late-stage or deadline-driven work, choose the smallest safe fix that changes runtime behavior only where required.
- If a proposed fix touches more layers than the reported defect naturally spans, stop and reassess scope before editing.
- Tests mirror scope: add tests only for supported scenarios inside current task scope.
- Explicit unsupported behavior must fail with a clear error instead of implicit behavior.
- Treat denormalized data as application-owned consistency work: do not assume the database will clean up embedded references, queued work, or cross-document read models.
- For delete, disconnect, unown, or similar destructive flows, explicitly identify every known reference holder and pending record that can outlive the source entity.
- Prefer idempotent cleanup steps for denormalized state so partial-failure recovery can safely rerun the same cleanup path.
- When removing an actor or entity, cancel or resolve pending work that still references it instead of leaving orphaned queued records behind.

## Project Stage Assumption
- The project is not in production yet.
- By default, backward compatibility is not required for new or updated API contracts and DTO fields unless explicitly requested.
- By default, backward compatibility is not required for data models, stored data formats, and migration paths unless explicitly requested.
- Prefer strict, explicit contracts over compatibility fallbacks unless compatibility support is explicitly requested.
- While the project is still in development, do not hide real command or service results behind reduced success-only acknowledgements such as `{ ok: true }` unless the user explicitly requests that contract.

## Cleanup
- Do not delete legacy files unless explicitly requested.
- Legacy files are kept for reference; avoid editing them unless asked.
- Legacy files live under `__*` folders or use `__*` prefixes.
- Keep domain entities free from infrastructure concerns (streams/guards live in base classes).
