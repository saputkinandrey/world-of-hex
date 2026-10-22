# Roman hastati: middle Republican equipment

Preset: `roman_hastati.json`. One pilum is held in the main hand, the scutum
in the off hand; a second pilum and the sword are carried. This is the starting
arrangement before the missile exchange, not a restriction on later weapon use.
The original arena presets under `legionary` and `armor` remain unchanged.

Historical basis: [Polybius, Histories 6.23](https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Polybius/6%2A.html).
He describes the curved scutum, Spanish sword, two pila, bronze helmet, greaves,
three upright purple or black feathers, and a small bronze heart-protector.
We use the pectorale variant for an ordinary soldier; Polybius describes mail
instead for soldiers above the stated property threshold.

Prototype representations and reconstruction choices:

- Both pila reference the existing `pilum` item. Polybius distinguishes stout
  and fine types; the catalog does not yet model them separately.
- `plume` represents the helmet's feather decoration as one accessory, not one
  feather. The source describes three feathers.
- One left greave is included, protecting the advanced leg below the shield.
  The initial pair was based on the plural wording of the cited English
  translation. M. C. Bishop's discussion instead reads Polybius 6.23.8 as a
  single greave and explains protection of the exposed left shin:
  [Roman Plate Armour](https://x-legio.com/file/104/Bishop%20-%20Roman%20plate%20armour.pdf).
  The preset follows this reconstruction rather than treating the English
  plural as evidence for two greaves. The original arena preset is unchanged.
- `gladius` and `heavy_bronze_helmet` are the available catalog representations,
  not an archaeological identification of a specific sword or helmet variant.
- Tunica and caligae provide the prototype's existing clothing and footwear;
  their exact form is not established by this passage.

The pectorale protects the front upper chest/heart area, not the whole torso.
Its existing `upper-chest` coverage and `front-vitals-protection` rule are retained.
No full cuirass, mail shirt, or later imperial segmented armor is included.
All item combat parameters remain unchanged; this preset adds no combat rules.
