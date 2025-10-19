import { NamedEntity } from './named.entity';

export class NamedCostEntity extends NamedEntity {
  /**
   *
   * @param {number} baseCost
   * @param {NamedEntity} rest
   */
  constructor({ baseCost = 0, ...rest } = {}) {
    super(rest);
    this.setBaseCost(baseCost);
  }

  /**
   *
   * @param {number} baseCost
   * @returns {NamedCostEntity}
   */
  setBaseCost(baseCost) {
    this.baseCost = baseCost;
    return this;
  }
}
