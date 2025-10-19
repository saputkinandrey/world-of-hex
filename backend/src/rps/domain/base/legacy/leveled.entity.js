import { NamedCostEntity } from './named-cost.entity';

export class LeveledEntity extends NamedCostEntity {
  /**
   *
   * @param {number} level
   * @param {number} levelCost
   * @param {number} levelIncrease
   * @param {number} baseLevel
   * @param {LeveledEntity} rest
   */
  constructor({
    level = 0,
    levelCost = 0,
    levelIncrease = 1,
    baseLevel = 0,
    ...rest
  } = {}) {
    super(rest);
    this.setLevel(level)
      .setLevelCost(levelCost)
      .setBaseLevel(baseLevel)
      .setLevelIncrease(levelIncrease)
      .setTotalLevel();
  }

  /**
   *
   * @param {number} levelIncrease
   * @returns {LeveledEntity}
   */
  setLevelIncrease(levelIncrease) {
    this.levelIncrease = levelIncrease;
    return this.setTotalLevel();
  }

  /**
   *
   * @param {number} totalLevel
   * @returns {LeveledEntity}
   */
  setTotalLevel(totalLevel = this.baseLevel + this.level * this.levelIncrease) {
    if (totalLevel !== this.baseLevel + this.level * this.levelIncrease) {
      this.totalLevel = totalLevel;
      this.setLevel((totalLevel - this.baseLevel) / this.levelIncrease);
    } else {
      this.totalLevel = totalLevel;
    }

    return this;
  }

  /**
   *
   * @param {number} level
   * @returns {LeveledEntity}
   */
  setLevel(level = 0) {
    if (level > -1) {
      this.level = level;
    }
    return this.setTotalLevel();
  }

  /**
   *
   * @param {number} levelCost
   * @returns {LeveledEntity}
   */
  setLevelCost(levelCost) {
    this.levelCost = levelCost;
    return this;
  }

  /**
   *
   * @param {number} baseLevel
   * @returns {LeveledEntity}
   */
  setBaseLevel(baseLevel) {
    this.baseLevel = baseLevel;
    return this.setTotalLevel();
  }
}
