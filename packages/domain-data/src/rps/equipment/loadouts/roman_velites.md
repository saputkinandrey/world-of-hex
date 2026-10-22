# Roman velites: historical basis and prototype choices

Preset: `roman_velites.json`. This is the initial skirmishing arrangement;
the sword is carried, the shield is held, and one light javelin is ready to throw.
It is independent of the original arena preset in `legionary/roman_velites.json`.

Polybius, Histories 6.22, describes a sword, light javelins, a round parma roughly
three feet across, and a plain helmet. He mentions an optional wolfskin or similar
covering for identification. He also describes a thin javelin point intended to
bend on impact. Source:
[Polybius, Histories, Book 6](https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Polybius/6%2A.html).

The preset has two javelins: one held and one carried. Parma velita is represented
with a fist grip (`grip: "fist"`). This follows the project design rule agreed with
the artist: a fist-grip shield allows two javelins, a strapped shield allows three.
This is a design decision, not an ammunition limit established by ancient sources.
The earlier five-javelin prototype count has been replaced in this preset only.

Polybius 6.22 does not describe the grip. Livy 38.21 describes transferring javelins
from the right hand to the left before drawing the sword, but does not establish
the shield attachment. A central grip is the reconstruction selected here, not
an unequivocally documented detail of every velite shield. References:
[Livy, Book 38, chapter 21](https://holypig.com/cotor/E-Books/misc/Livy/HOR_38.htm)
and [Legio X Fretensis: Parma](https://x-legio.com/en/wiki/parma).

Livy 26.4 describes seven javelins for selected light infantry operating with
cavalry at Capua. This is a particular episode, not evidence for a universal
two- or three-javelin rule:
[Livy, Book 26, chapter 4](https://holypig.com/cotor/E-Books/misc/Livy/HOR_26.htm).

The existing
gladius, bronze helmet, tunica, and caligae are prototype representations, not
claims that this passage establishes their exact material, form, or footwear.
The optional animal skin is omitted from this first preset. No torso armor or
greaves are included.

Item combat parameters remain unchanged. Their DR, defense bonus, weight,
cost, and range values are game data, not measurements established by Polybius.
The historical bending behavior is not yet represented in `hasta_velitaris.rules`;
this preset does not add combat behavior or alter arena mechanics.

Known item weights total 15.8 lb (about 7.2 kg), excluding the tunica and caligae,
whose weights are unspecified. The sum is not a complete equipment weight.
