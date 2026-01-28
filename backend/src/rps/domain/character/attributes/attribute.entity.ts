import { LeveledEntity } from '../../base/leveled.entity';

export type DependencyCallback = (char: any) => number;

export class AttributeEntity extends LeveledEntity {
    dependency?: DependencyCallback;

    constructor({ ...rest }: Partial<LeveledEntity> = { baseLevel: 10 }) {
        super(rest);
    }

    setDependency(dependency: DependencyCallback = (char) => 0): this {
        this.dependency = dependency;
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

    setTotalLevel(
        totalLevel: number = this.baseLevel + this.level * this.levelIncrease,
    ): this {
        super.setTotalLevel(totalLevel);
        return this;
    }

    setLevelIncrease(levelIncrease: number): this {
        super.setLevelIncrease(levelIncrease);
        return this;
    }
}
