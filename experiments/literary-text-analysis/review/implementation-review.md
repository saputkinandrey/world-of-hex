# Implementation review

Scope: only the new literary-text-analysis experiment, against the pasted v0.1.0
request and repository AGENTS.md. Existing experiments are read only.

## Standards

Fixed inconsistent revision projections, missing validation of manual correction
references, and merging of EPUB paragraphs nested in list items. Human textual
object participants now require valid exact source anchors as well.

## Spec

Fixed disagreement between character ambiguity records, resolved mentions and
fragment participants. Reused the same prior-only revision validation in working
state and saved projections. Preserved separate author paragraphs inside EPUB
lists and heading sections. Added focused regression tests for these paths.

Two independent read-only review passes confirmed the projection and parser
fixes. Review calls did not execute models or modify source files. Model-quality
assessment remains separate; no independent human literary gold is available.

Original findings: Standards 3 plus 1 residual participant-anchor validation,
all addressed; Spec 3, all addressed. The two axes include overlapping defects
and are not added together as a unique-issue count.
