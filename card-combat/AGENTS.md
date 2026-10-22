# Combat stand parity

- The turn-based and realtime stands share one combat model. Every future combat-rule change must apply to both stands and have parity coverage.
- Keep damage, armor, defense matching, skills, decks, FP/mana rules, equipment verbs and action costs in the shared `src` modules. Do not implement combat effects in page components or independently in the realtime adapter.
- Mode-specific differences are scheduling only: alternating turns versus FIFO queues, boundary timing, AP regeneration cadence, timed draw, and turn-based versus timed heavy-card recovery.
- Current explicit realtime timing: 10-second segments, +2 AP per segment, 20-second default draw (10/20/30 selectable), 10-second heavy cooldown. Turn-based recovery remains +3 AP per own turn. These are intentional timing conversions, not separate combat balance rules.
- Physical defense cards stay reserved until the defense is consumed or released in either mode. Virtual defenses expire at the corresponding response boundary. Only attack-card release timing differs according to realtime execution rules.
- Run `npm test` and `npm run build` in `card-combat` after changing shared combat or mode adapters. Preserve the separate arena/RPS behavior.
