import { displayMod, generateUniqueId } from '../../../../lib/utilities.js';
import { ModifierEntity } from './modifier.entity';
import { BaseEntity } from '../../../../lib/base.entity';

class ModifierStackEntity {
  /**
   *
   * @param data {ModifierStackEntity|object}
   */
  constructor(data = {}) {
    /**
     *
     * @type {ModifierEntity[]}
     */
    this.modifierList = data.modifierList
      ? data.modifierList.map((mod) => new ModifierEntity(mod))
      : [];

    /**
     *
     * @type {ModifierEntity[]}
     */
    this.savedModifierList = data.savedModifierList
      ? data.savedModifierList.map((mod) => new ModifierEntity(mod))
      : [];

    /**
     *
     * @type {number}
     */
    this.currentSum = data.currentSum || 0;
    /**
     *
     * @type {string}
     */
    this.displaySum = data.displaySum || '+0';
    /**
     *
     * @type {boolean}
     */
    this.plus = data.plus || false;
    /**
     *
     * @type {boolean}
     */
    this.minus = data.minus || false;

    /**
     * do we automatically empty the bucket when a roll is made?
     * @type {boolean}
     */
    this.AUTO_EMPTY = data.AUTO_EMPTY || true;
  }

  /**
   *
   * @returns {boolean}
   */
  toggleAutoEmpty() {
    this.AUTO_EMPTY = !this.AUTO_EMPTY;
    return this.AUTO_EMPTY;
  }

  /**
   *
   * @returns {ModifierStackEntity}
   */
  savelist() {
    this.savedModifierList = this.modifierList;
    this.modifierList = [];
    this.sum();
    return this;
  }

  /**
   *
   * @returns {ModifierStackEntity}
   */
  restorelist() {
    this.modifierList = this.savedModifierList;
    this.sum();
    return this;
  }

  /**
   *
   * @returns {ModifierStackEntity}
   */
  sum() {
    this.currentSum = 0;
    for (let m of this.modifierList) {
      this.currentSum += m.modint;
    }
    this.displaySum = displayMod(this.currentSum);
    this.plus = this.currentSum > 0 || this.modifierList.length > 0; // cheating here... it shouldn't be named "plus", but "green"
    this.minus = this.currentSum < 0;
    return this;
  }

  /**
   * @param {string} mod
   * @param {any} reason
   * @returns {ModifierEntity}
   */
  _makeModifier(mod, reason) {
    let n = displayMod(mod);
    return new ModifierEntity({
      mod: n,
      modint: parseInt(n),
      desc: reason,
      plus: n[0] != '-',
    });
  }

  /**
   * @param {string} reason
   * @param {string} mod
   * @returns {ModifierStackEntity}
   */
  add(mod, reason, replace = false) {
    this._add(this.modifierList, mod, reason, replace);
    this.sum();
    return this;
  }

  /**
   * @param {ModifierEntity[]} list
   * @param {string} mod
   * @param {string} reason
   * @returns {ModifierStackEntity}
   */
  _add(list, mod, reason, replace = false) {
    /** @type {ModifierEntity|undefined} */
    var oldmod;
    let i = list.findIndex(
      (e) => e.desc == reason && !e.desc.match(/\* *Cost/i),
    ); // Don't double up on *Costs modifiers... so they will pay the full cost
    if (i > -1) {
      if (replace)
        list.splice(i, 1); // only used by range modifier
      else oldmod = list[i]; // Must modify list (cannot use filter())
    }
    // let m = (mod + '').match(/([+-])?@margin/i)
    // if (!!m) {
    //     mod = (GURPS.lastTargetedRoll?.margin || 0) * (m[1] == '-' ? -1 : 1)
    //     if (GURPS.lastTargetedRoll?.thing)
    //         reason = reason.replace(/-@/, ' -').replace(/\+@/, '') + ' for ' + GURPS.lastTargetedRoll.thing
    // }
    if (!!oldmod) {
      let m = oldmod.modint + parseInt(mod);
      oldmod.mod = displayMod(m);
      oldmod.modint = m;
    } else {
      list.push(this._makeModifier(mod, reason));
    }
    return this;
  }

  /**
   * Called during the dice roll to return a list of modifiers and then clear
   * @param {ModifierEntity[]} targetmods
   * @returns {ModifierEntity[]}
   */
  applyMods(targetmods = []) {
    let answer = !!targetmods ? targetmods : [];
    answer = answer.concat(this.modifierList);
    if (this.AUTO_EMPTY) this.reset();
    return answer;
  }

  /**
   * @param {ModifierEntity[]} otherstacklist
   * @returns {ModifierStackEntity}
   *
   */
  reset(otherstacklist = []) {
    this.modifierList = otherstacklist;
    this.sum();
    return this;
  }

  /**
   * @param {number} index
   * @returns {ModifierStackEntity}
   */
  removeIndex(index) {
    this.modifierList.splice(index, 1);
    this.sum();
    return this;
  }
}
