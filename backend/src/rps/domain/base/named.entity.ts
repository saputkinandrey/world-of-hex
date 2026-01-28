export interface NamedEntityInit extends Partial<NamedEntity> {
    name?: string;
    alias?: string;
}

/**
 * Сущность с именем и псевдонимом.
 */
export class NamedEntity {
    name: string;
    alias: string;

    constructor({ name = '', alias = '' }: NamedEntityInit = {}) {
        this.setName(name).setAlias(alias);
    }

    setName(name: string): this {
        if (name) {
            this.name = name.trim();
        }
        return this;
    }

    setAlias(alias: string): this {
        this.alias = alias;
        return this;
    }
}
