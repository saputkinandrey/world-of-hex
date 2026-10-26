# Decisions v1.0.0

1. Use the existing labels.json mapping, with locally numbered group owners and
   the official surface IDs retained unchanged. Do not infer owner maps from PNG.
2. Share one explicitly selected DensePose skin baseline per atlas. Preserve all
   five historical maps as well as every frame's own original texture. The fixed
   owner invariant refers to the SHARED selected baseline, not five different
   historical DensePose predictions that the task intentionally replaces by reuse.
3. Preserve out-of-alpha predictions in densepose-original and unclipped groups;
   define valid owners only on alpha. This reconciles source preservation with
   the required no-owner-outside-alpha invariant, without altering source data.
4. Compute independent shortest group distances, with ties left unknown. The
   same-group sources are one owner; label order does not break cross-group ties.
5. Report all requested radii without optimization. Retain original unknown-region
   areas, boundaries, per-radius minimum distances and unresolved components.
6. Geometry alone is insufficient for cross-view anatomy. Inspect all 50 rigid
   hypotheses but transfer only by the predetermined identity/flip consensus and
   local original-north support. Do not select an alignment by maximal IoU. The
   tests include a positive transfer, a protected conflicting label and no-anchor
   rejection. Zero accepted real transfers is a legitimate measured outcome.
7. Existing flood assignments are also kept fixed in the assisted stage. Transfer
   fills remaining U only; no implicit conflict correction occurs.
8. Conflict diagnostics retain non-unanimous alternatives separately from accepted
   transfer. They identify disagreement, not a proven mistake by either view.
9. Mirror pixels/provenance exactly, never intrinsic anatomical IDs. No hidden L/R
   relabeling. Full atlases retain each frame index rather than reversing order.
10. Tests and recomputation check invariants, not pixel-level anatomical quality.
    No model calls, morphology, manual masks, rig guidance or texture reconstruction.
