/**
 * The point of this file is that these classes may be used outside of the ActorEntity, but do not have
 * any dependencies on ActorEntity.
 *
 * If that changes -- if any class is modified or added that has an external dependency -- we need
 * to think really hard about potentially moving the class back to actor.js.
 */

import {
  convertRollStringToArrayOfInt,
  extractP,
} from '../../../lib/utilities.js';

export class Skill extends Leveled {
  /**
   * @param {string} [n1]
   * @param {string} [lvl]
   */
  constructor(n1, lvl) {
    super(n1, lvl);
    this.type = ''; // "DX/E";
    this.relativelevel = ''; // "DX+1";
  }
}

export class Spell extends Leveled {
  /**
   * @param {string} [n1]
   * @param {string} [lvl]
   */
  constructor(n1, lvl) {
    super(n1, lvl);
    this.class = '';
    this.college = '';
    this.cost = '';
    this.maintain = '';
    this.duration = '';
    this.resist = '';
    this.casttime = '';
    this.difficulty = '';
    this.relativelevel = ''; // "IQ+1"
  }
}

export class Advantage extends NamedCost {
  /**
   * @param {string} [n1]
   */
  constructor(n1) {
    super(n1);
    this.userdesc = '';
    this.note = ''; // GCS has notes (note) and userdesc for an advantage, so the import code combines note and userdesc into notes
  }
}

export class Attack extends Named {
  /**
   * @param {string} [n1]
   * @param {string} [lvl]
   * @param {string|Array<string>} [dmg]
   */
  constructor(n1, lvl, dmg) {
    super(n1);
    this.import = lvl;
    this.damage = dmg;
    this.st = '';
    this.mode = '';
    this.level = '';

    Object.assign(Leveled.prototype, _AnimationMixin);
  }

  get animationData() {
    return /** @type {_AnimationMixin} */ (/** @type {unknown} */ (this));
  }
}

export class Melee extends Attack {
  /**
   * @param {string} [n1]
   * @param {string} [lvl]
   * @param {string} [dmg]
   */
  constructor(n1, lvl, dmg) {
    super(n1, lvl, dmg);

    this.weight = '';
    this.techlevel = '';
    this.cost = '';
    this.reach = '';
    this.parry = '';
    this.block = '';
  }
}

export class Ranged extends Attack {
  /**
   * @param {string} [n1]
   * @param {string} [lvl]
   * @param {string} [dmg]
   */
  constructor(n1, lvl, dmg) {
    super(n1, lvl, dmg);

    this.bulk = '';
    this.legalityclass = '';
    this.ammo = '';
    this.acc = '';
    this.range = '';
    this.rof = '';
    this.shots = '';
    this.rcl = '';
    this.halfd = '';
    this.max = '';
  }
  checkRange() {
    if (!!this.halfd) this.range = this.halfd;
    if (!!this.max) this.range = this.max;
    if (!!this.halfd && !!this.max) this.range = this.halfd + '/' + this.max;
  }
}

export class Note extends _Base {
  /**
   * @param {string} [n]
   * @param {boolean} [ue]
   */
  constructor(n, ue) {
    super();

    this.notes = n || '';
    this.save = ue;
  }
}

export class Encumbrance {
  constructor() {
    this.key = '';
    this.level = 0;
    this.dodge = 9;
    this.weight = '';
    this.move = 0;
    this.current = false;
  }
}

export class Equipment extends Named {
  /**
   * @param {string} [nm]
   * @param {boolean} [ue]
   */
  constructor(nm, ue) {
    super(nm);
    this.save = ue;
    this.equipped = false;
    this.carried = false;
    this.count = 0;
    this.cost = 0;
    this.weight = 0;
    this.location = '';
    this.techlevel = '';
    this.legalityclass = '';
    this.categories = '';
    this.costsum = 0;
    this.weightsum = 0;
    this.uses = '';
    this.maxuses = '';
    this.ignoreImportQty = false;
    this.uuid = '';
    this.parentuuid = '';
    this.itemid = '';
    /** @type {{ [key: string]: any }} */
    this.collapsed = {};
    /** @type {{ [key: string]: any }} */
    this.contains = {};
  }

  /**
   * @param {Equipment} eqt
   */
  static calc(eqt) {
    Equipment.calcUpdate(null, eqt, '');
  }

  // OMG, do NOT fuck around with this method.   So many gotchas...
  // the worst being that you cannot use array.forEach.   You must use a for loop
  /**
   * @param {Actor | null} actor
   * @param {Equipment} eqt
   * @param {string} objkey
   */
  static async calcUpdate(actor, eqt, objkey) {
    if (!eqt) return;
    const num = (/** @type {string | number} */ s) => {
      // @ts-ignore
      return isNaN(s) ? 0 : Number(s);
    };
    const cln = (/** @type {number} */ s) => {
      return !s ? 0 : num(String(s).replace(/,/g, ''));
    };

    eqt.count = cln(eqt.count);
    eqt.cost = cln(eqt.cost);
    eqt.weight = cln(eqt.weight);
    let cs = eqt.count * eqt.cost;
    let ws = eqt.count * eqt.weight;
    if (!!eqt.contains) {
      for (let k in eqt.contains) {
        // @ts-ignore
        let e = eqt.contains[k];
        await Equipment.calcUpdate(actor, e, objkey + '.contains.' + k);
        cs += e.costsum;
        ws += e.weightsum;
      }
    }
    if (!!eqt.collapsed) {
      for (let k in eqt.collapsed) {
        // @ts-ignore
        let e = eqt.collapsed[k];
        await Equipment.calcUpdate(actor, e, objkey + '.collapsed.' + k);
        cs += e.costsum;
        ws += e.weightsum;
      }
    }
    if (!!actor)
      await actor.update({
        [objkey + '.costsum']: cs,
        [objkey + '.weightsum']: ws,
      });
    // the local values 'should' be updated... but I need to force them anyway
    eqt.costsum = cs;
    eqt.weightsum = ws;
  }
}

export class Reaction {
  /**
   * @param {string | undefined} [m]
   * @param {string | undefined} [s]
   */
  constructor(m, s) {
    this.modifier = m || '';
    this.situation = s || '';
  }
}

export class Modifier extends Reaction {}

export class Language {
  constructor(n, s, w, p) {
    this.name = n;
    this.spoken = s || '';
    this.written = w || '';
    this.points = p || '';
  }
}

/**
 * A representation of a Hit Location and DR on that location. If
 * this.damageType is set, this.dr will return a damage type-specific
 * DR value.
 *
 * Otherwise you can call this.getDR(type) to retrieve just the DR for
 * a specific type without first setting this.damageType.
 */
export class HitLocationEntry {
  static getLargeAreaDR(entries) {
    let lowestDR = Number.POSITIVE_INFINITY;
    let torsoDR = 0;

    for (let value of entries.filter((it) => it.roll.length > 0)) {
      if (value.dr < lowestDR) lowestDR = value.dr;
      if (value.where === 'Torso') torsoDR = value.dr;
    }
    // return the average of torso and lowest dr
    return Math.ceil((lowestDR + torsoDR) / 2);
  }

  static findLocation(entries, where) {
    return entries.find((it) => it.where === where);
  }

  constructor(where, dr, rollText, split) {
    this.where = where;
    this._dr = parseInt(dr);
    this._damageType = null;
    this.rollText = rollText;
    this.roll = convertRollStringToArrayOfInt(rollText);
    this.split = split;
  }

  getDR(damageType) {
    if (!damageType || !this.split) return this._dr;
    return !!this?.split[damageType] ? this.split[damageType] : this._dr;
  }

  get dr() {
    return this.getDR(this._damageType);
  }

  set damageType(damageType) {
    this._damageType = damageType;
  }
}
