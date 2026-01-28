import { AttributeEntity, DependencyCallback } from './attribute.entity';

export class ResourceAttributeEntity extends AttributeEntity {
    currentLevel!: number;

    constructor({
        currentLevel,
        ...rest
    }: { currentLevel?: number } & Partial<AttributeEntity> = {}) {
        super(rest);
        this.setCurrentLevel(currentLevel);
    }

    setDependency(
        dependency: DependencyCallback = () => {
            return 0;
        },
    ): this {
        if (dependency) {
            super.setDependency(dependency);
        }
        return this;
    }

    setCurrentLevel(currentLevel: number = this.totalLevel): this {
        if (currentLevel <= this.totalLevel) {
            this.currentLevel = currentLevel;
        }
        return this;
    }

    setName(name: string): this {
        super.setName(name);
        return this;
    }

    setAlias(alias: string): this {
        super.setAlias(alias);
        return this;
    }

    setBaseLevel(baseLevel: number): this {
        super.setBaseLevel(baseLevel);
        return this;
    }

    setBaseCost(baseCost: number): this {
        super.setBaseCost(baseCost);
        return this;
    }

    setLevel(level: number = 0): this {
        super.setLevel(level);
        return this;
    }

    setLevelCost(levelCost: number): this {
        super.setLevelCost(levelCost);
        return this;
    }

    setLevelIncrease(levelIncrease: number): this {
        super.setLevelIncrease(levelIncrease);
        return this;
    }

    setTotalLevel(
        totalLevel: number = this.baseLevel + this.level * this.levelIncrease,
    ): this {
        super.setTotalLevel(totalLevel);
        return this;
    }
}
