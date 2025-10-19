import { NamedCostEntity } from './named-cost.entity';

interface LeveledEntityInit extends Partial<LeveledEntity> {
  level?: number;
  levelCost?: number;
  levelIncrease?: number;
  baseLevel?: number;
}

/**
 * Класс, описывающий сущность с уровнями, базовым уровнем и коэффициентом роста.
 */
export class LeveledEntity extends NamedCostEntity {
  level: number;
  levelCost: number;
  levelIncrease: number;
  baseLevel: number;
  totalLevel: number;

  constructor({
    level = 0,
    levelCost = 0,
    levelIncrease = 1,
    baseLevel = 0,
    ...rest
  }: LeveledEntityInit = {}) {
    super(rest);
    this.setLevel(level)
      .setLevelCost(levelCost)
      .setBaseLevel(baseLevel)
      .setLevelIncrease(levelIncrease)
      .setTotalLevel();
  }

  setLevelIncrease(levelIncrease: number): this {
    this.levelIncrease = levelIncrease;
    return this.setTotalLevel();
  }

  setTotalLevel(
    totalLevel: number = this.baseLevel + this.level * this.levelIncrease,
  ): this {
    if (totalLevel !== this.baseLevel + this.level * this.levelIncrease) {
      this.totalLevel = totalLevel;
      this.setLevel((totalLevel - this.baseLevel) / this.levelIncrease);
    } else {
      this.totalLevel = totalLevel;
    }
    return this;
  }

  setLevel(level: number = 0): this {
    if (level > -1) {
      this.level = level;
    }
    return this.setTotalLevel();
  }

  setLevelCost(levelCost: number): this {
    this.levelCost = levelCost;
    return this;
  }

  setBaseLevel(baseLevel: number): this {
    this.baseLevel = baseLevel;
    return this.setTotalLevel();
  }
}
