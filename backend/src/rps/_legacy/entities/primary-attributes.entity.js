import { AttributeEntity } from './attribute.entity';

export class PrimaryAttributesEntity {
  /**
   *
   * @param {AttributeEntity} st
   * @param {AttributeEntity} dx
   * @param {AttributeEntity} iq
   * @param {AttributeEntity} ht
   */
  constructor({
    st = new AttributeEntity()
      .setLevelCost(10)
      .setAlias('ST')
      .setName('Strength'),
    dx = new AttributeEntity()
      .setLevelCost(20)
      .setAlias('DX')
      .setName('Dexterity'),
    iq = new AttributeEntity()
      .setLevelCost(20)
      .setAlias('IQ')
      .setName('Intelligence'),
    ht = new AttributeEntity()
      .setLevelCost(10)
      .setAlias('HT')
      .setName('Health'),
  } = {}) {
    this.setST(st, true).setDX(dx, true).setIQ(iq, true).setHT(ht, true);
  }

  /**
   *
   * @param st {AttributeEntity}
   * @param copy {boolean}
   * @returns {PrimaryAttributesEntity}
   */
  setST(st, copy = false) {
    if (copy) {
      this.st = new AttributeEntity(st);
    } else {
      this.st = st;
    }
    return this;
  }

  /**
   *
   * @param {AttributeEntity} dx
   * @param {boolean} copy
   * @returns {PrimaryAttributesEntity}
   */
  setDX(dx, copy = false) {
    if (copy) {
      this.dx = new AttributeEntity(dx);
    } else {
      this.dx = dx;
    }
    return this;
  }

  /**
   *
   * @param {AttributeEntity} iq
   * @param {boolean} copy
   * @returns {PrimaryAttributesEntity}
   */
  setIQ(iq, copy = false) {
    if (copy) {
      this.iq = new AttributeEntity(iq);
    } else {
      this.iq = iq;
    }
    return this;
  }

  /**
   *
   * @param {AttributeEntity} ht
   * @param {boolean} copy
   * @returns {PrimaryAttributesEntity}
   */
  setHT(ht, copy = false) {
    if (copy) {
      this.ht = new AttributeEntity(ht);
    } else {
      this.ht = ht;
    }
    return this;
  }
}
