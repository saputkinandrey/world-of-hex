import { LeveledEntity } from '../../../base/legacy/leveled.entity';

export class AttributeEntity extends LeveledEntity {
  /**
   *
   * @param {LeveledEntity} rest
   */
  constructor({ ...rest } = { baseLevel: 10 }) {
    super(rest);
  }

  /**
   * @callback DependencyCallback
   * @param {_characterEntity} char
   * @returns {number}
   *
   */

  /**
   *
   * @param {DependencyCallback} dependency
   * @returns {AttributeEntity}
   */
  setDependency(dependency = (char) => {}) {
    this.dependency = dependency;
    return this;
  }

  /**
   *
   * @param name {string}
   * @returns {AttributeEntity}
   */
  setName(name) {
    return super.setName(name);
  }

  /**
   *
   * @param alias {string}
   * @returns {AttributeEntity}
   */
  setAlias(alias) {
    return super.setAlias(alias);
  }

  /**
   *
   * @param baseLevel {number}
   * @returns {AttributeEntity}
   */
  setBaseLevel(baseLevel) {
    super.setBaseLevel(baseLevel);
  }

  /**
   *
   * @param baseCost {number}
   * @returns {AttributeEntity}
   */
  setBaseCost(baseCost) {
    return super.setBaseCost(baseCost);
  }

  /**
   *
   * @param level {number}
   * @returns {AttributeEntity}
   */
  setLevel(level = 0) {
    super.setLevel(level);
  }

  /**
   *
   * @param levelCost {number}
   * @returns {AttributeEntity}
   */
  setLevelCost(levelCost) {
    return super.setLevelCost(levelCost);
  }

  /**
   *
   * @param totalLevel {number}
   * @returns {AttributeEntity}
   */
  setTotalLevel(totalLevel = this.baseLevel + this.level * this.levelIncrease) {
    return super.setTotalLevel(totalLevel);
  }

  /**
   *
   * @param levelIncrease {number}
   * @returns {AttributeEntity}
   */
  setLevelIncrease(levelIncrease) {
    return super.setLevelIncrease(levelIncrease);
  }
}

const ST = new AttributeEntity()
  .setAlias('ST')
  .setName('Strength')
  .setBaseCost(0)
  .setBaseLevel(10)
  .setLevelCost(10);
