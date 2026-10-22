# Equipment definitions and loadouts

Use `@wohex/domain-data/rps/equipment` for the shared equipment API.

- `items/weapons`, `items/shields`, `items/armor`, and `items/gear`: one JSON
  definition per item, identified by a globally unique `id`.
- `loadouts/*.json`: one reusable equipment preset per build.
- `loadouts/armor` and `loadouts/legionary`: the original arena presets in their
  original format, now stored as independent JSON files.
- `legacy-catalogs.json`: the original arena item IDs. The compatibility catalogs
  expose exactly these IDs and original field shapes, preserving arena behavior.

To add an item, place its JSON file in the appropriate item directory. To add a
build, place a JSON file in `loadouts` referencing existing item IDs. No manual
TypeScript registration is required. Run `npm run build --workspace @wohex/domain-data`
from the repository root; it discovers files, validates references, generates the
typed registry, and compiles it. TypeScript also checks all definition shapes.
`generated.ts` is build output and must not be edited.

Each loadout entry contains `itemId`, `quantity`, and `placement`. Placements are
`main-hand`, `off-hand`, `both-hands`, `worn`, and `carried`. For example:

```json
{
    "id": "pilum_carrier",
    "name": "Pilum carrier",
    "items": [
        { "itemId": "gladius", "quantity": 1, "placement": "main-hand" },
        { "itemId": "pilum", "quantity": 2, "placement": "carried" }
    ]
}
```

The registry rejects duplicate IDs, missing references, nonpositive quantities,
unknown placements, conflicting hands, and two-handed weapons held in one hand.
`resolveEquipmentLoadout(id)` returns the entries with their item definitions.
It does not invent aggregate damage, armor coverage, weight, or cost.

The 12 pregenerated fighters reference these presets via `equipmentLoadoutId`.
Create a new preset and change that field to equip a fighter differently without
editing their skills or the item definitions. Shared item edits affect every new
loadout resolution; editing a preset affects each fighter that selects it.

The new gladiator items preserve available parameters from the original combat
lenses. Unknown weights, prices, and other physical values remain optional;
absence means unspecified, not zero. These are editable prototype definitions,
not a completed equipment balance pass. Existing arena definitions retain their
original values.

Run `npm run equipment:test --workspace @wohex/domain-data` to build and check
loadout resolution, fighter integration, quantities, and invalid definitions.
