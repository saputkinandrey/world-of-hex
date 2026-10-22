# Shared combat calculations

Import from `@wohex/domain-data/rps/combat`. The arena keeps its existing
resolver; this module is the independent rules core for the card prototype.

## Arena integration

Stage 1 uses `getBaseCombatStats` for arena starting HP, unencumbered Move
and Dodge (including Combat Reflexes). Arena shield bonuses, equipment movement
penalties and minimum scores still apply in `scenario.ts`. No attack, injury,
fatigue, random-stream or AI behavior changes in this stage.

`web-client/scripts/fixtures/arena-rps-baseline.json` records hashes of the
initial battle and every state through 20 rounds for three seeds, captured before
this integration. The arena regression suite verifies these trajectories exactly.
Do not regenerate these fixtures merely to make a failed integration check pass;
changes to combat rules require an explicitly reviewed new behavioral contract.

Stage 2 adds an opt-in weapon/armor damage mode. Select "Оружие и броня (РПС)"
before starting an arena battle, or call `createArenaSetup(seed, "rps")`.
The default remains the original simplified damage model during the staged migration.
Reset and regeneration retain the selected mode; changing rules is available only
before battle starts. Existing baseline fixtures and expectations are unchanged.

The arena adapter maps composite equipment names to registered item IDs explicitly.
Amritar attacks use the primary spear (not the knife or Hand of Ra); cloth/leather
DR 2 and Bronze/Grace DR 4 are inherited prototype torso protection values.
Magical activation effects are not inferred from equipment names. Sica uses swing;
other arena melee weapons use thrust. Current attacks target the torso, so manica,
greaves, helmets and the upper-chest pectorale do not protect that hit location.
Legacy actor damage caches remain unchanged, including the DR value currently
used by armor-rattle perception. RPS damage reads item definitions directly;
enabling it does not independently change sound generation or AI inputs.

Only the damage/armor portion is shared in this stage. Attack checks, awareness,
defense selection, seeded random channels, HP clamping and aftermath remain owned
by the arena. `resolveDamage` computes penetration and injury without applying
shock, knockdown or death checks; those transitions belong to the next migration.
Arena integration tests cover known damage values, every equipment alias and
deterministic completed battles for three seeds in the new mode.

Stage 3 shares shock, major-wound thresholds, health-check targets and low-HP
mobility thresholds. Arena attack resolution retains each positive injury as a
separate entry; RPS aftermath rejects absent entries or inconsistent summed damage.
Every torso injury greater than half maximum HP gets its own HT check. Several
smaller injuries do not produce a major-wound check merely because their sum is large.
Shock accumulates from individual injuries, affects the next turn's existing skill
penalty and then expires; High Pain Threshold suppresses shock and improves injury
checks. Fit improves injury and stun-recovery checks.

New stunning cannot recover in the same turn. Existing stunning can recover after
an inactive turn; while stunned, all active defenses lose 4 points in RPS mode.
Below one third HP, arena Move and Dodge halve, rounding upward. The arena retains
uninjured mobility scores so repeated rounds do not compound this penalty and
later HP restoration can restore those scores. Legacy mode keeps its original rules.

This stage preserves arena incapacitation at zero HP and does not add negative-HP
survival, death, unconsciousness or prone posture transitions. The independent
RPS core still supports those transitions; their arena lifecycle requires a separate
integration. Fatigue remains separate from this HP integration stage.

## Contract

- `createCombatant` resolves a pregenerated fighter and its modular equipment.
  HP defaults to ST, FP to HT. Functions return new states without changing inputs.
- `resolveAttack` performs a trained skill check, optional active defense,
  weapon damage, worn armor resistance and injury transitions. The caller must
  retain `result.attacker` and `result.injury.combatant` when present.
- Optional integer `attackModifier`, `damageModifier` and `defenseModifier`
  allow consumers to supply card effects. Defaults are zero. Damage modifiers
  apply before half-range damage, armor and injury multipliers; consumers own
  effect duration and costs. Existing arena callers keep their original behavior.
- A thrown weapon leaves the ready hand even on a miss. Carried reserves are
  not automatically readied. Equipment changes and AP belong to the card engine.
- Attack skill names are declared per mode in the item file. In this prototype,
  pilum thrust and throw share Spear; hasta velitaris uses Javelin for both.
- ST damage supports 1..20. Thrust, swing and throw use distinct bonuses.
  Throwing checks reach, range penalties and half damage beyond half-damage range.
- Armor applies only when worn and covering the hit zone. Worn layers add DR.
  Shields grant active defense bonus, not passive torso DR. Skull adds natural DR 2.
  Pectorale protects front upper chest/vitals, not the whole torso or rear.
  Helmet face coverage rolls its declared fraction. Mail uses its crushing DR.
- After DR, cut multiplies injury by 1.5, imp by 2, imp to vitals by 3,
  skull injury by 4; fractions round down.
- Shock accumulates to 4 and affects skill, not active defense. High Pain Threshold
  suppresses it and adds 3 to knockdown checks. Fit adds 1 to health checks.
- A single injury greater than half max HP triggers a major-wound check.
  Head/vitals hits can trigger knockdown without a major wound. Failure causes
  stunning and prone state; severe failure causes unconsciousness.
- Below one third HP, Move/Dodge halve; below one third FP, ST also halves.
  HP and FP Move/Dodge penalties compound, rounding upward. Prone and stunned
  states apply defense penalties. Zero HP requires consciousness checks each turn.
- Crossed negative HP multiples cause death checks; -5 max HP means death.
  Prototype death-check failures mean immediate death (no mortal-wound subsystem).
- `spendFatigue` spends FP; loss below zero also removes HP. At -max FP the
  fighter becomes unconscious. At zero FP voluntary exertion requires an IQ
  check (default Will). FP and AP are separate resources.
- `recoverFatigue` takes complete resting minutes: one FP per 10 minutes,
  or per 5 with Fit. Supply the complete interval, not fractional rest ticks.
  `heal` restores HP to its maximum. Neither automatically wakes a fighter.
- Call `beginTurn` once before an actor turn and `endTurn` once after it.
  End-turn clears shock and checks recovery from stunning; it does not stand up
  or wake an unconscious fighter. The caller owns posture and waking actions.
- Randomness is injected as a function returning an integer die face 1..6.
  Unsupported weapon modes, untrained skills, missing ready equipment,
  invalid amounts and out-of-range attacks produce explicit errors.

## Deliberate prototype limits

This is a GURPS-inspired combat subset, not a complete GURPS implementation.
Checks use simplified automatic success/failure, without critical-hit tables.
Limb crippling, bleeding, shield damage, pilum deformation/sticking, armor gaps,
aiming, visibility, shield facing arcs and environmental modifiers are not resolved.
Location multipliers on limbs use the general injury rule without crippling caps.
Move is unencumbered; equipment weights may be unknown, so no total mass is invented.
The caller must provide valid combat maneuvers and select supported defense skills;
the resolver does not implement maneuver selection, equipment switching or cards.

The cumulative low-HP/FP penalty follows the publisher's clarification:
[GURPS FAQ 3.4.5.7](https://www.sjgames.com/gurps/faq/FAQ4-3.html).
Project item and character data remain the source for equipment and skill values.

Run `npm run combat:test` and `npm run equipment:test` in `packages/domain-data`.

## Eye hit location

The additive eyes location uses -9 to attack skill and x4 injury, without
natural skull DR 2. Supported eye attacks require impaling damage; cutting
and crushing eye attacks fail explicitly. Existing head knockdown rules apply
with the skull major-wound penalty. Current equipment has no explicit eye
coverage. Eye-specific crippling, blindness and eye-slit aiming are outside
this implementation.

References: GURPS Basic Set, Fourth Edition, pp. 399 and 552;
[official rules FAQ](https://www.sjgames.com/gurps/faq/FAQ4-3.html).

## Will and mana

Fighter profiles store an independent positive integer will. Generated fighters
initialize Will from IQ without an additional random draw; pregenerated JSON
profiles can edit it independently. The World of Hex mana maximum equals Will,
and createCombatant starts with full mana in state.mana. Mana is distinct from
HP and FP and does not change at turn boundaries.

spendMana rejects insufficient mana; recoverMana caps recovery at maxMana.
restoreManaWithEffort spends exactly 1 FP and restores floor(Will / 2), capped
at maxMana, with no roll and no action-point cost. It requires an acting fighter
and at least 1 FP. Mana is a World of Hex resource, not GURPS FP spellcasting.
