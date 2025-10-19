import { AttributeEntity } from './attribute.entity';

export class ResourceAttributeEntity extends AttributeEntity {
  /**
   *
   * @param {number} currentLevel
   * @param {AttributeEntity} rest
   */
  constructor({ currentLevel, ...rest } = {}) {
    super(rest);
    this.setCurrentLevel();
  }

  /**
   *
   * @param {DependencyCallback} dependency
   * @returns {ResourceAttributeEntity}
   */
  setDependency(dependency = (char) => {}) {
    return super.setDependency(dependency);
  }

  /**
   *
   * @param currentLevel {number}
   * @returns {ResourceAttributeEntity}
   */
  setCurrentLevel(currentLevel = this.totalLevel) {
    if (currentLevel <= this.totalLevel) {
      this.currentLevel = currentLevel;
    }
    return this;
  }

  /**
   *
   * @param name {string}
   * @returns {ResourceAttributeEntity}
   */
  setName(name) {
    return super.setName(name);
  }

  /**
   *
   * @param alias {string}
   * @returns {ResourceAttributeEntity}
   */
  setAlias(alias) {
    return super.setAlias(alias);
  }

  /**
   *
   * @param baseLevel {number}
   * @returns {ResourceAttributeEntity}
   */
  setBaseLevel(baseLevel) {
    return super.setBaseLevel(baseLevel);
  }

  /**
   *
   * @param baseCost {number}
   * @returns {ResourceAttributeEntity}
   */
  setBaseCost(baseCost) {
    return super.setBaseCost(baseCost);
  }

  /**
   *
   * @param level {number}
   * @returns {ResourceAttributeEntity}
   */
  setLevel(level = 0) {
    return super.setLevel(level);
  }

  /**
   *
   * @param levelCost {number}
   * @returns {ResourceAttributeEntity}
   */
  setLevelCost(levelCost) {
    return super.setLevelCost(levelCost);
  }

  /**
   *
   * @param levelIncrease {number}
   * @returns {ResourceAttributeEntity}
   */
  setLevelIncrease(levelIncrease) {
    return super.setLevelIncrease(levelIncrease);
  }

  /**
   *
   * @param totalLevel {number}
   * @returns {ResourceAttributeEntity}
   */
  setTotalLevel(totalLevel = this.baseLevel + this.level * this.levelIncrease) {
    return super.setTotalLevel(totalLevel);
  }
}

const ST = new AttributeEntity()
  .setName('Strength')
  .setAlias('ST')
  .setBaseLevel(10)
  .setLevelCost(10)
  .setLevel(5);

const HP = new ResourceAttributeEntity()
  .setName('Hit Points')
  .setAlias('HP')
  .setBaseLevel(ST.totalLevel)
  .setLevelCost(2)
  .setCurrentLevel();
