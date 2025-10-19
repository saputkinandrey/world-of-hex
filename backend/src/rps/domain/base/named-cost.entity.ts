import { NamedEntity } from './named.entity';

interface NamedCostEntityInit extends Partial<NamedCostEntity> {
  baseCost?: number;
}

/**
 * Сущность с именем и базовой стоимостью.
 */
export class NamedCostEntity extends NamedEntity {
  baseCost: number;

  constructor({ baseCost = 0, ...rest }: NamedCostEntityInit = {}) {
    super(rest);
    this.setBaseCost(baseCost);
  }

  setBaseCost(baseCost: number): this {
    this.baseCost = baseCost;
    return this;
  }
}
