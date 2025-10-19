import {
  HitLocation,
  ArmorMaterials,
  ArmorMaterial,
  ArmorHitLocationStats,
} from './utils';

interface EquipmentEntityParams {
  coverage?: number;
  material: ArmorMaterial;
  layers?: number;
}

export class EquipmentEntity {
  coverage: number;
  material: ArmorMaterial;
  layers: number;
  dr: number;
  cost: number;
  weight: number;

  constructor({ coverage = 0, material, layers = 1 }: EquipmentEntityParams) {
    this.coverage = 0;
    this.material = material;
    this.layers = layers;
    this.dr = 0;
    this.cost = 0;
    this.weight = 0;

    this.setCoverage(coverage)
      .setLayers(layers)
      .setMaterial(material)
      .calculateCost()
      .calculateWeight()
      .calculateDr();
  }

  /**
   * Рассчитывает DR брони с учётом покрытия и родительских зон
   * Если DR разных зон различается, кидает ошибку
   */
  calculateDr(): this {
    if (!this.material || !this.coverage) {
      this.dr = 0;
      return this;
    }

    let drValue: number | null = null;

    for (const zoneKeyStr of Object.keys(ArmorHitLocationStats)) {
      const zoneBit = Number(zoneKeyStr);
      const zoneStats = ArmorHitLocationStats[zoneBit];

      // Игнорируем дочерние зоны, если родитель покрыт
      if (
        zoneStats.parentZone &&
        (this.coverage & zoneStats.parentZone) !== 0
      ) {
        continue;
      }

      if ((this.coverage & zoneBit) !== 0) {
        const zoneDr = this.material.drPerLayer * this.layers;

        if (drValue === null) {
          drValue = zoneDr;
        } else if (drValue !== zoneDr) {
          throw new Error(
            `Inconsistent DR detected: zone ${zoneBit} has DR ${zoneDr}, expected ${drValue}`,
          );
        }
      }
    }

    this.dr = drValue ?? 0;
    return this;
  }

  /**
   * Рассчитывает стоимость брони с учётом покрытия и родительских зон
   * Суммируются только зоны верхнего уровня (родительские зоны игнорируют дочерние)
   * При этом разные конечности считаются отдельно
   */
  calculateCost(): this {
    if (!this.material || !this.coverage) {
      this.cost = 0;
      return this;
    }

    let totalCost = 0;

    for (const zoneKeyStr of Object.keys(ArmorHitLocationStats)) {
      const zoneBit = Number(zoneKeyStr);
      const zoneStats = ArmorHitLocationStats[zoneBit];

      // Пропускаем дочерние зоны, если их родитель покрыт
      if (
        zoneStats.parentZone &&
        (this.coverage & zoneStats.parentZone) !== 0
      ) {
        continue;
      }

      // Добавляем стоимость только если зона покрыта
      if ((this.coverage & zoneBit) !== 0) {
        totalCost += zoneStats.baseCost * this.material.costMult * this.layers;
      }
    }

    this.cost = totalCost;
    return this;
  }

  /**
   * Рассчитывает вес брони с учётом покрытия и родительских зон
   * Суммируются только зоны верхнего уровня (родительские зоны игнорируют дочерние)
   * При этом разные конечности считаются отдельно
   */
  calculateWeight(): this {
    if (!this.material || !this.coverage) {
      this.weight = 0;
      return this;
    }

    let totalWeight = 0;

    for (const zoneKeyStr of Object.keys(ArmorHitLocationStats)) {
      const zoneBit = Number(zoneKeyStr);
      const zoneStats = ArmorHitLocationStats[zoneBit];

      // Пропускаем дочерние зоны, если их родитель покрыт
      if (
        zoneStats.parentZone &&
        (this.coverage & zoneStats.parentZone) !== 0
      ) {
        continue;
      }

      // Добавляем вес только если зона покрыта
      if ((this.coverage & zoneBit) !== 0) {
        totalWeight +=
          zoneStats.baseWeight * this.material.weightMult * this.layers;
      }
    }

    this.weight = totalWeight;
    return this;
  }

  setMaterial(material: ArmorMaterial): this {
    this.material = material;
    return this;
  }

  setLayers(layers: number): this {
    this.layers = layers;
    return this;
  }

  setCost(cost: number): this {
    this.cost = cost;
    return this;
  }

  setWeight(weight: number): this {
    this.weight = weight;
    return this;
  }

  setDr(dr: number): this {
    this.dr = dr;
    return this;
  }

  setCoverage(coverage: number): this {
    this.coverage = coverage;
    return this;
  }
}

const LightCuirass = new EquipmentEntity({
  coverage: HitLocation.VITALS | HitLocation.CHEST,
  material: ArmorMaterials.PLATE_STEEL,
  layers: 1,
});

const MediumCuirass = new EquipmentEntity({
  coverage: HitLocation.VITALS | HitLocation.CHEST,
  material: ArmorMaterials.PLATE_STEEL,
  layers: 2,
});

const HeavyCuirass = new EquipmentEntity({
  coverage: HitLocation.VITALS | HitLocation.CHEST,
  material: ArmorMaterials.PLATE_STEEL,
  layers: 3,
});
