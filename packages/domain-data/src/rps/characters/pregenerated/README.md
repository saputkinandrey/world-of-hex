# Pregenerated fighters

These 12 JSON files are editable character snapshots: three Roman Hastati, three
Roman Principes, three Roman Velites, and three Roman Triarii.

The original roster used Murmillo, Hoplomachus, Thraex, and Retiarius, generated
with initial seeds 20261007 through 20261018. Generation retries identical
attribute sets within a specialization.

Fighters 01-03, 04-06, and 10-12 have been regenerated as Hastati, Principes, and
Triarii using initial seeds 20261100 plus their fighter number, preserving IDs and
names. Each new profile meets its class requirements. Their independent presets
are `roman_hastati`, `roman_principes`, and `roman_triarii`.

Fighters 07-09 originally used the Thraex specialization. They now use Roman
Velites skills and the `roman_velites` equipment preset, preserving their IDs,
names, and generated attributes. All three meet the Velites ST requirement.

Each file contains a stable `id`, a display `name`, and the character profile.
The original snapshots stored skills and equipment in `lens`. After equipment
modularization, skills remain in `lens`, while `equipmentLoadoutId` selects an
independent preset under `rps/equipment/loadouts`. An optional command
specialization remains in `commandLens`. The current shape is `PregeneratedFighter`.

Change `equipmentLoadoutId` to select a different build. Edit the preset to change
its item selection, quantities, or placements. Edit an item definition to change
that item across builds. Profiles do not duplicate item combat parameters.

The files are the source of truth for these fighters. Manual edits must not be
replaced by regeneration or by reloading a lens from the catalog. The filename
records the original specialization; `id` remains the character's identity.

`attributes` contains the effective ST, DX, IQ, and HT values. If changing
attributes, also update `baseAttributes` or `mutation` to preserve their
relationship. Skill levels are calculated by the shared `getSkillLevel` helper;
they are not separately cached in these files.

| ID         | Name    | Original specialization |
| ---------- | ------- | ----------------------- |
| fighter-01 | Lucius  | Roman Hastati           |
| fighter-02 | Marcus  | Roman Hastati           |
| fighter-03 | Gaius   | Roman Hastati           |
| fighter-04 | Doros   | Roman Principes         |
| fighter-05 | Titus   | Roman Principes         |
| fighter-06 | Quintus | Roman Principes         |
| fighter-07 | Theron  | Roman Velites           |
| fighter-08 | Brann   | Roman Velites           |
| fighter-09 | Cassian | Roman Velites           |
| fighter-10 | Nereus  | Roman Triarii           |
| fighter-11 | Ashar   | Roman Triarii           |
| fighter-12 | Nadir   | Roman Triarii           |

# Combat deck in the character sheet

Each fighter JSON contains `combatDeck.stratagems`, a map of technique IDs to
copy counts. The combat prototype reads this explicit selection; omitted
techniques are not automatically added when skills improve. The current stand
accepts 0..3 copies and validates access to each selected technique. Physical
projectile cards still come from the equipment loadout quantities. The stand
shows the prepared deck without a deckbuilding editor.

## Copy-concurrency test roster

The editable snapshots now deliberately span different primary weapon mastery.
Primary skill levels are Hastati 10/12/16, Principes 12/14/16, Velites 10/12/14,
and Triarii 10/14/16. Shield skills are 14/12/16 within each group. The stand's
current conversion produces weapon copy counts 1/2/3/4 at levels 10/12/14/16.
These are virtual concurrent commitments, not physical equipment quantities.

Chosen technique decks also vary: vitals frequency follows mastery (up to three),
feint and evaluate frequencies give defensive, mixed and offensive test variants.
Only the snapshots change; class lenses and arena recruit generation stay intact.
