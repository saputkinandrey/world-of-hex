# Sea Combat Rules Roadmap

This document tracks the delivery order for expanding deterministic sea-combat rules beyond deployment and forward movement.

It is narrower than the root [ROADMAP.md](./ROADMAP.md):

- `ROADMAP.md` keeps whole-project sequencing
- `ROADMAP.sea-combat-rules.md` keeps the combat-rules track only

## Scope

This roadmap covers:

- encounter rules that affect ship behavior during turn processing
- deterministic combat resolution
- intent validation that depends on encounter state
- combat outcomes that must be replayable from committed history

This roadmap does not cover:

- broader websocket API design except where combat rules force contract changes
- Godot client work
- P2P transport/storage migration
- broader world-simulation systems outside sea combat

## Current Baseline

The current rules baseline already has:

- deployment turn `0`
- spawn as a pending intent
- forward movement by direction and speed
- per-turn movement processing
- collision stop on a shared hex
- officer-owned maneuver intent groups:
  - `helmsman`
  - `boatswain`
- supported base maneuver combinations derived from those officer intents:
  - `forward + hold`
  - `forward + accelerate`
- `forward + decelerate`
- `turn-left + hold`
- `turn-right + hold`
- `turn-left + decelerate`
- `turn-right + decelerate`
- `turn-left + accelerate`
- `turn-right + accelerate`
- wind-relative seamanship modifiers for maneuver rolls
- backend-authored projected trajectories and predicted crossings for the next turn

This means the next work should not rebuild the loop from scratch. It should extend the existing deterministic rule set.

## Primary Goal

The immediate goal of this track is to turn the current movement prototype into a real sea-combat ruleset without breaking deterministic replay.

That means:

- new combat actions must be resolved inside the encounter domain model
- target-dependent actions must validate against real encounter state
- non-deterministic outcomes must become explicit committed facts
- turn resolution must remain replayable from history

## Subsystem Order

The next subsystem sequence for sea combat should be:

1. finish ship movement beyond strictly forward motion
2. implement ship fitting / modules
3. only after modules exist, start the combat skeleton

This ordering is intentional:

- maneuver rules come first because they define how ships can position before broader combat systems exist
- modules come next because they provide the equipment/state model the combat skeleton should build on
- the first combat skeleton should be implemented on top of the module system rather than forcing a later retrofit

## Rule Design Constraints

- combat rules stay encounter-specific and must not leak into service orchestration
- pending intents remain the player-facing mechanism for declaring actions
- ship maneuver intent should be modeled as officer-owned intent groups rather than a flat ship-level list of combined actions
- `helmsman` owns heading intent:
    - `forward`
    - `turn-left`
    - `turn-right`
- `boatswain` owns speed-management intent:
    - `accelerate`
    - `decelerate`
    - `hold`
- the encounter aggregate should derive the actual ship maneuver for the turn from the combination of these officer intents
- ship speed, facing, current position, and next-turn projected trajectory are treated as open information
- wind direction should be visible to the player as open information so maneuver modifiers are readable without guessing
- player-facing combat UX should explain why a maneuver did or did not succeed instead of leaving roll-dependent outcomes implicit
- previous-turn roll outcomes and current-turn predicted success chances should be treated as first-class combat feedback, not debug-only data
- trajectory-based interaction should use the first hex where projected ship trajectories intersect during the turn
- for this phase, treat ships as meeting at that first intersection hex even if a step-by-step physical simulation would differ
- `flee`, `pursue`, and `circle` should return later as captain-owned top-level tactical intents
- captain-owned tactical intents should derive officer-owned maneuver intents inside the encounter aggregate rather than replacing the officer model
- invalid intents must fail explicitly or resolve explicitly as rejected; no silent fallback
- randomness must be shared-input deterministic and auditable
- if a rule outcome matters later, it must be committed as history rather than recomputed from loose assumptions
- admin correction tools may remain stronger than player tools, but should not become the primary way to progress combat

## Delivery Order

### Phase 1: Turn Semantics Hardening

Before adding more combat verbs, the turn algorithm should be explicit and stable about:

- which parts of the turn use the new `turnNumber`
- which parts still reason about the previous state
- where pending intents are validated
- where intent outcomes become committed history
- what exact order different rule categories resolve in

Required result:

- there is one documented and enforced order of resolution for encounter turns
- replay and normal execution follow the same domain semantics

### Phase 2: Intent Validation Expansion

The next rules step should focus on actions whose validity depends on context rather than only on ship-local degrees of freedom.

Examples:

- target-based attack actions
- captain-owned intents unlocked by predicted trajectory intersection, such as ramming or boarding
- boarding
- range-limited actions
- ally / enemy checks
- same-hex / adjacent-hex checks

Required result:

- encounter aggregate validates actor-target relationships itself
- invalid target selections are rejected by domain rules, not by optimistic client assumptions
- officer-owned intent groups are resolved together into one actual ship maneuver without collapsing the model back into flat combined action enums

### Phase 3: Core Combat Outcomes

After context-sensitive validation exists, add the first true combat outcomes.

This phase should cover:

- attack resolution
- explicit hit / miss / effect facts
- damage or other ship-state changes that persist across turns
- rule outcomes that can affect later movement or action availability

Required result:

- combat is no longer only positioning; turns can produce durable combat consequences
- all such consequences are reconstructible from committed events

### Phase 4: Status Effects and Ongoing Combat State

Once direct combat outcomes exist, extend to continuing consequences.

This phase should cover:

- temporary or persistent combat modifiers
- action-blocking states
- degraded ship capability
- effects that alter later rolls or available intents

Required result:

- ongoing combat state is represented explicitly in the domain model and replayable from history

### Phase 5: Resolution Coverage and Rule Completeness

Only after the above phases are stable should this track aim for "core sea combat is complete enough".

This phase should cover:

- closing obvious gaps between available intents and supported resolution rules
- removing throwaway prototype shortcuts in combat resolution
- ensuring the admin and web-client flows can exercise the supported combat verbs

Required result:

- the rule set is coherent enough to treat sea combat as the finished prototype combat domain

## Immediate Next Candidates

The next concrete tasks in this track should come from this order:

1. make combat resolution readable to the player:
   - show wind direction in the encounter workspace
   - expose previous-turn roll outcomes
   - expose predicted success chances for currently selectable actions
2. make turn resolution ordering explicit and durable
3. [done] refactor ship maneuver intents into officer-owned groups:
   - `helmsman`
   - `boatswain`
4. reintroduce `flee` / `pursue` / `circle` as captain-owned top-level tactics that derive officer intents
5. remove remaining manual pending-intent dispatch inside the encounter aggregate
6. finish movement rules beyond strictly forward motion
7. implement the ship fitting / modules subsystem
8. add the first combat-skeleton actions on top of that module system
9. add the first target-dependent combat action with full domain validation
10. persist its roll outcomes and combat consequences as explicit facts

## Near-Term Priority: Combat Transparency

Before expanding command vocabulary further, the client needs enough combat transparency for players to understand what happened and why.

This priority should cover:

- visible wind direction in the encounter workspace
- readable explanation of the wind-relative maneuver modifiers
- previous-turn seamanship and tactics roll outcomes where they mattered
- predicted success chances for currently available player actions
- clear separation between open information and hidden information
- do not autoplay next-turn preview in a permanent loop on the client
- step-based preview should be used primarily to animate real turn advancement after the backend confirms the next turn
- manual preview playback, if kept, should be explicit and one-shot rather than continuously looping in the background

Required result:

- a player can explain why a ship accelerated, failed to accelerate, kept speed, or lost speed
- the encounter workspace stops behaving like a black box for roll-driven maneuver outcomes
- step-based motion visualization supports understanding of actual turn transitions without turning the workspace into a constantly replaying animation

## Future Tactical Layer: Captain Intent

After combat transparency is in place, add captain-owned tactical intents as a higher-level control layer.

This layer should start with:

- `flee`
- `pursue`
- `circle`

These should act as top-level tactical goals, not as low-level movement commands.

Required result:

- the encounter aggregate derives `helmsman` and `boatswain` intents from the selected captain tactic
- captain tactics remain compatible with deterministic replay and auditable rule resolution

## Determinism Requirements

Every new combat rule should be checked against these questions:

- can different workers derive the same result from the same committed inputs
- are all random outcomes represented explicitly enough for replay
- does the rule depend on current encounter state rather than on client-provided assumptions
- will later rules be able to trust this outcome as historical fact

If the answer is "no", the rule is not ready to be treated as part of the real combat system.

## Testing Expectations

For each new combat mechanic, the useful verification shape is:

- one domain-level deterministic scenario
- one rejection scenario for invalid intent or invalid target
- one replay-oriented scenario proving the committed history reproduces the same state
- one runtime scenario through the actual API path when the mechanic becomes user-triggerable

The point is not test count. The point is proving deterministic rule behavior.

## Explicit Non-Goals For This Track

- no broad MMO/world-simulation mechanics
- no protocol redesign unrelated to combat rules
- no replacing pending intents with a different player command model during this phase
- no turning admin-only debug actions into the primary gameplay path
- no widening scope to non-sea encounter types before sea-combat core rules are complete

## Exit Condition

This roadmap track should be considered complete when:

- sea combat has deterministic resolution for its core action set
- target-dependent actions are validated in the encounter domain model
- meaningful combat consequences persist across turns
- replay can faithfully reconstruct those consequences from committed history
- the websocket-first prototype API can exercise the finished core sea-combat rule set
