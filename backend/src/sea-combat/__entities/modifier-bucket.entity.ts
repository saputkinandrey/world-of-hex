export class ModifierEntity {
    value: number = 0;
    reason: string = 'NO REASON';
    target: string | null = null;
    additive: boolean = false;
    turnsLeft: number | null = null;
}

export enum ModifierBucketClearMode {
    All,
    Expired,
}

export class ModifierBucketEntity {
    modifiers: ModifierEntity[] = [];

    addModifier(modifier: ModifierEntity) {
        this.modifiers.push(modifier);
        return this;
    }

    startTurn() {
        this.modifiers.forEach((modifier) => {
            if (modifier.turnsLeft !== null) {
                modifier.turnsLeft--;
            }
        });
        return this.clear(ModifierBucketClearMode.Expired);
    }

    clear(mode: ModifierBucketClearMode = ModifierBucketClearMode.All) {
        switch (mode) {
            case ModifierBucketClearMode.All:
                this.modifiers = [];
                break;
            case ModifierBucketClearMode.Expired:
                this.modifiers = this.modifiers.filter(
                    (mod) => mod.turnsLeft == null || mod.turnsLeft <= 0,
                );
                break;
        }
        return this;
    }

    total(target: string | null = null) {
        const allReasons = {};

        this.modifiers
            .filter(
                (mod) =>
                    mod.target == null ||
                    target == null ||
                    mod.target == target,
            )
            .forEach((modifier) => {
                if (!allReasons.hasOwnProperty(modifier.reason)) {
                    allReasons[modifier.reason] = modifier.value;
                    return;
                }
                if (allReasons.hasOwnProperty(modifier.reason)) {
                    if (modifier.additive) {
                        allReasons[modifier.reason] += modifier.value;
                        return;
                    }
                    if (
                        Math.abs(allReasons[modifier.reason]) <
                        Math.abs(modifier.value)
                    ) {
                        allReasons[modifier.reason] = modifier.value;
                    }
                }
            });

        return Number(
            Object.values(allReasons).reduce(
                (acc: number, current: number) => Number(acc + current),
                0,
            ),
        );
    }
}
