import { ArmorMaterials, HitLocation, ArmorHitLocationStats } from './domain/utils';

export class EquipmentEntity {
  /**
   *
   * @param {HitLocation} coverage
   * @param {ArmorMaterial} material
   * @param {number} layers
   */
  constructor({ coverage = 0, material, layers = 1 } = {}) {
    this.setCoverage(coverage)
      .setLayers(layers)
      .setMaterial(material)
      .calculateCost()
      .calculateWeight()
      .calculateDr();
  }

  /**
   * Рассчитывает суммарный DR для всего покрытия брони
   * @returns {EquipmentEntity}
   */
  calculateDr() {
    if (!this.material || !this.coverage) {
      this.dr = 0;
      return this;
    }

    let totalDr = 0;
    for (const zoneBit of Object.keys(ArmorHitLocationStats).map(Number)) {
      if ((this.coverage & zoneBit) !== 0) {
        totalDr += this.material.drPerLayer * this.layers;
      }
    }

    this.dr = totalDr;
    return this;
  }

  calculateCost() {
    if (!this.material || !this.coverage) {
      this.cost = 0;
      return this;
    }

    let totalCost = 0;
    for (const [zone, stats] of Object.entries(ArmorHitLocationStats)) {
      const zoneBit = Number(zone); // ключ как число
      if ((this.coverage & zoneBit) !== 0) {
        totalCost += stats.baseCost * this.material.costMult * this.layers;
      }
    }

    this.cost = totalCost;
    return this;
  }

  calculateWeight() {
    if (!this.material || !this.coverage) {
      this.weight = 0;
      return this;
    }

    let totalWeight = 0;
    for (const [zone, stats] of Object.entries(ArmorHitLocationStats)) {
      const zoneBit = Number(zone); // ключ как число
      if ((this.coverage & zoneBit) !== 0) {
        totalWeight +=
          stats.baseWeight * this.material.weightMult * this.layers;
      }
    }

    this.weight = totalWeight;
    return this;
  }

  /**
   *
   * @param {ArmorMaterial} material
   * @returns {EquipmentEntity}
   */
  setMaterial(material) {
    this.material = material;
    return this;
  }

  /**
   *
   * @param {number} layers
   * @returns {EquipmentEntity}
   */
  setLayers(layers) {
    this.layers = layers;
    return this;
  }

  /**
   *
   * @param {number} cost
   * @returns {EquipmentEntity}
   */
  setCost(cost) {
    this.cost = cost;
    return this;
  }

  /**
   *
   * @param {number} weight
   * @returns {EquipmentEntity}
   */
  setWeight(weight) {
    this.weight = weight;
    return this;
  }

  /**
   *
   * @param {number} dr
   * @returns {EquipmentEntity}
   */
  setDr(dr) {
    this.dr = dr;
    return this;
  }

  setCoverage(coverage) {
    this.coverage = coverage;

    return this;
  }
}

