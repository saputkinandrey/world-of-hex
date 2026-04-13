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

    addModifier(modifier: ModifierEntity): this;
    addModifier(event: ModifierAddedEvent): this;
    @ChildAction(ModifierAddedEvent)
    addModifier(modifierOrEvent: ModifierEntity | ModifierAddedEvent) {
        const nextModifier = modifierOrEvent instanceof ModifierAddedEvent ? modifierOrEvent.modifier : modifierOrEvent;
        const action = getOwnActionEvent(this, ModifierAddedEvent);
        const { modifier: resolvedModifier } = action.setNamedArgs({
            modifier: nextModifier,
        });
        return this.applyAddModifier(resolvedModifier);
    }

    startTurn(): this;
    startTurn(event: ModifierBucketTurnStartedEvent): this;
    @ChildAction(ModifierBucketTurnStartedEvent)
    startTurn(_event?: ModifierBucketTurnStartedEvent) {
        const action = getOwnActionEvent(this, ModifierBucketTurnStartedEvent);
        action.setNamedArgs({});
        return this.applyStartTurn();
    }

    clear(mode: ModifierBucketClearMode): this;
    clear(event: ModifierBucketClearedEvent): this;
    @ChildAction(ModifierBucketClearedEvent)
    clear(modeOrEvent: ModifierBucketClearMode | ModifierBucketClearedEvent = ModifierBucketClearMode.All) {
        const nextMode = modeOrEvent instanceof ModifierBucketClearedEvent ? modeOrEvent.mode : modeOrEvent;
        const action = getOwnActionEvent(this, ModifierBucketClearedEvent);
        const { mode: resolvedMode } = action.setNamedArgs({
            mode: nextMode,
        });
        return this.applyClear(resolvedMode);
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
