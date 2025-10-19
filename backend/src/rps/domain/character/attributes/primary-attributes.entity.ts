import { AttributeEntity } from './attribute.entity';

export class PrimaryAttributesEntity {
  st: AttributeEntity;
  dx: AttributeEntity;
  iq: AttributeEntity;
  ht: AttributeEntity;

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
  }: {
    st?: AttributeEntity;
    dx?: AttributeEntity;
    iq?: AttributeEntity;
    ht?: AttributeEntity;
  } = {}) {
    this.setST(st, true).setDX(dx, true).setIQ(iq, true).setHT(ht, true);
  }

  setST(st: AttributeEntity, copy: boolean = false): this {
    if (copy) {
      this.st = new AttributeEntity(st);
    } else {
      this.st = st;
    }
    return this;
  }

  setDX(dx: AttributeEntity, copy: boolean = false): this {
    if (copy) {
      this.dx = new AttributeEntity(dx);
    } else {
      this.dx = dx;
    }
    return this;
  }

  setIQ(iq: AttributeEntity, copy: boolean = false): this {
    if (copy) {
      this.iq = new AttributeEntity(iq);
    } else {
      this.iq = iq;
    }
    return this;
  }

  setHT(ht: AttributeEntity, copy: boolean = false): this {
    if (copy) {
      this.ht = new AttributeEntity(ht);
    } else {
      this.ht = ht;
    }
    return this;
  }
}
