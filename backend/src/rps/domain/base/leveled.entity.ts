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

    constructor({ level = 0, levelCost = 0, levelIncrease = 1, baseLevel = 0, ...rest }: LeveledEntityInit = {}) {
        super(rest);
        // Assign fields before setters: setLevel/setTotalLevel depend on baseLevel and levelIncrease.
        this.level = level;
        this.levelCost = levelCost;
        this.baseLevel = baseLevel;
        this.levelIncrease = levelIncrease;
        this.totalLevel = this.computeTotalLevel();
    }

    private computeTotalLevel(): number {
        return this.baseLevel + this.level * this.levelIncrease;
    }

    setLevelIncrease(levelIncrease: number): this {
        this.levelIncrease = levelIncrease;
        this.totalLevel = this.computeTotalLevel();
        return this;
    }

    setTotalLevel(totalLevel: number = this.computeTotalLevel()): this {
        const expected = this.computeTotalLevel();
        if (
            totalLevel === expected ||
            !Number.isFinite(totalLevel) ||
            !Number.isFinite(this.levelIncrease) ||
            this.levelIncrease === 0
        ) {
            this.totalLevel = Number.isFinite(expected) ? expected : totalLevel;
            return this;
        }

        this.totalLevel = totalLevel;
        const nextLevel = (totalLevel - this.baseLevel) / this.levelIncrease;
        if (Number.isFinite(nextLevel) && nextLevel > -1) {
            this.level = nextLevel;
            this.totalLevel = this.computeTotalLevel();
        }
        return this;
    }

    setLevel(level: number = 0): this {
        if (level > -1) {
            this.level = level;
        }
        this.totalLevel = this.computeTotalLevel();
        return this;
    }

    setLevelCost(levelCost: number): this {
        this.levelCost = levelCost;
        return this;
    }

    setBaseLevel(baseLevel: number): this {
        this.baseLevel = baseLevel;
        this.totalLevel = this.computeTotalLevel();
        return this;
    }
}
