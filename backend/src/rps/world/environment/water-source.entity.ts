// world/environment/water-source.entity.ts

import type { HexId } from '../hex.entity';
import type { ActorEntity } from '../actor/actor.entity';

export interface WaterSourceInit {
    id: string;
    hexId: HexId;
    liters: number;
    maxLiters?: number;
    regenRatePerHour?: number;
}

export class WaterSourceEntity {
    id: string;
    hexId: HexId;

    liters: number;
    maxLiters: number;
    regenRatePerHour: number;

    constructor(params: WaterSourceInit) {
        this.setId(params.id)
            .setHexId(params.hexId)
            .setMaxLiters(params.maxLiters ?? params.liters)
            .setLiters(params.liters)
            .setRegenRatePerHour(params.regenRatePerHour ?? 0);
    }

    setId(id: string): this {
        this.id = id;
        return this;
    }

    setHexId(hexId: HexId): this {
        this.hexId = hexId;
        return this;
    }

    setLiters(liters: number): this {
        const v = Number.isFinite(liters) ? liters : 0;
        this.liters = Math.min(this.maxLiters, Math.max(0, v));
        return this;
    }

    changeLiters(delta: number): this {
        return this.setLiters(this.liters + delta);
    }

    setMaxLiters(maxLiters: number): this {
        const v = Number.isFinite(maxLiters) ? maxLiters : 0;
        this.maxLiters = Math.max(0, v);
        if (this.liters > this.maxLiters) {
            this.liters = this.maxLiters;
        }
        return this;
    }

    setRegenRatePerHour(rate: number): this {
        const v = Number.isFinite(rate) ? rate : 0;
        this.regenRatePerHour = Math.max(0, v);
        return this;
    }

    regenerate(deltaHours: number): void {
        if (this.regenRatePerHour <= 0 || deltaHours <= 0) return;
        this.changeLiters(this.regenRatePerHour * deltaHours);
    }

    getDrinkableWaterLitersFor(_actor: ActorEntity): number {
        return this.liters;
    }

    consumeDrinkableWater(_actor: ActorEntity, liters: number): void {
        if (!Number.isFinite(liters) || liters <= 0) return;
        const take = Math.min(this.liters, liters);
        if (take <= 0) return;
        this.liters -= take;
    }
}
