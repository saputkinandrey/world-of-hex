export class NamedEntity {
  /**
   *
   * @param {string} name
   * @param {string} alias
   */
  constructor({ name = '', alias = '' } = {}) {
    this.setName(name).setAlias(alias);
  }

  /**
   *
   * @param {string} name
   * @returns {NamedEntity}
   */
  setName(name) {
    if (!!name) {
      this.name = name.trim();
    }
    return this;
  }

  /**
   *
   * @param {string} alias
   * @returns {NamedEntity}
   */
  setAlias(alias) {
    this.alias = alias;
    return this;
  }
}

const newOne = new NamedEntity();
