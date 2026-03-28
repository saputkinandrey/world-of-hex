import { ChildAction } from '../../utils/child-action.decorator';
import { getOwnActionEvent } from '../../utils/action-event';
import { StreamAwareEntity } from '../../utils/stream-aware-entity';
import {
    ModifierAddedEvent,
    ModifierBucketClearedEvent,
    ModifierBucketTurnStartedEvent,
} from './encounter/events/modifier-bucket.events';

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

export class ModifierBucketEntity extends StreamAwareEntity {
    constructor() {
        super();
        this.setOwnerKey('shipId');
    }

    shipId: string;

    modifiers: ModifierEntity[] = [];

    @ChildAction(ModifierAddedEvent)
    addModifier(modifier: ModifierEntity) {
        const action = getOwnActionEvent(this, ModifierAddedEvent);
        const { modifier: nextModifier } = action.setNamedArgs({
            modifier,
        });
        return this.applyAddModifier(nextModifier);
    }

    @ChildAction(ModifierBucketTurnStartedEvent)
    startTurn() {
        const action = getOwnActionEvent(this, ModifierBucketTurnStartedEvent);
        action.setNamedArgs({});
        return this.applyStartTurn();
    }

    @ChildAction(ModifierBucketClearedEvent)
    clear(mode: ModifierBucketClearMode = ModifierBucketClearMode.All) {
        const action = getOwnActionEvent(this, ModifierBucketClearedEvent);
        const { mode: nextMode } = action.setNamedArgs({
            mode,
        });
        return this.applyClear(nextMode);
    }

    total(target: string | null = null) {
        const allReasons: Record<string, number> = {};

        this.modifiers
            .filter((mod) => mod.target == null || target == null || mod.target == target)
            .forEach((modifier) => {
                if (!allReasons.hasOwnProperty(modifier.reason)) {
                    allReasons[modifier.reason] = modifier.value;
                    return;
                }
                if (modifier.additive) {
                    allReasons[modifier.reason] += modifier.value;
                    return;
                }
                if (Math.abs(allReasons[modifier.reason]) < Math.abs(modifier.value)) {
                    allReasons[modifier.reason] = modifier.value;
                }
            });

        return Number(Object.values(allReasons).reduce((acc, current) => Number(acc + current), 0));
    }

    private applyAddModifier(modifier: ModifierEntity) {
        this.modifiers.push(modifier);
        return this;
    }

    private applyStartTurn() {
        this.modifiers.forEach((modifier) => {
            if (modifier.turnsLeft !== null) {
                modifier.turnsLeft--;
            }
        });
        return this.applyClear(ModifierBucketClearMode.Expired);
    }

    private applyClear(mode: ModifierBucketClearMode) {
        switch (mode) {
            case ModifierBucketClearMode.All:
                this.modifiers = [];
                break;
            case ModifierBucketClearMode.Expired:
                this.modifiers = this.modifiers.filter((mod) => mod.turnsLeft == null || mod.turnsLeft > 0);
                break;
        }
        return this;
    }
}
