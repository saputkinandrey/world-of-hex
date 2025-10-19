export class ModifierEntity {
  /**
   *
   * @param data?{object}
   */
  constructor(data = {}) {
    /**
     *
     * @type {string}
     */
    this.mod = '';
    /**
     *
     * @type {number}
     */
    this.modint = 0;
    /**
     *
     * @type {string}
     */
    this.desc = '';
    /**
     *
     * @type {boolean}
     */
    this.plus = false;

    this.INIT(data);
  }

  /**
   *
   * @param mod {string}
   * @returns {ModifierEntity}
   */
  setMod(mod) {
    this.mod = mod;
    return this;
  }

  /**
   *
   * @param modint {number}
   * @returns {ModifierEntity}
   */
  setModInt(modint) {
    this.modint = modint;
    return this;
  }

  /**
   *
   * @param desc {string}
   * @returns {ModifierEntity}
   */
  setDesc(desc) {
    this.desc = desc;
    return this;
  }

  /**
   *
   * @param plus {boolean}
   * @returns {ModifierEntity}
   */
  setPlus(plus) {
    this.plus = plus;
    return this;
  }
}
