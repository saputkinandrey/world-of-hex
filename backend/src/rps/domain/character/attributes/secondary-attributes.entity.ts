import { AttributeEntity } from './attribute.entity';
import { ResourceAttributeEntity } from './resource-attribute.entity';
import { PrimaryAttributesEntity } from './primary-attributes.entity';

export class SecondaryAttributesEntity {
  per: AttributeEntity;
  will: AttributeEntity;
  hp: ResourceAttributeEntity;
  fp: ResourceAttributeEntity;
  liftSt: AttributeEntity;
  strikeSt: AttributeEntity;
  basicSpeed: AttributeEntity;
  basicMove: AttributeEntity;

  constructor({
    per = new AttributeEntity()
      .setDependency(
        (char: { primary: PrimaryAttributesEntity }) =>
          char.primary.iq.totalLevel,
      )
      .setAlias('PER')
      .setName('Perception')
      .setLevelCost(5),
    will = new AttributeEntity()
      .setDependency(
        (char: { primary: PrimaryAttributesEntity }) =>
          char.primary.iq.totalLevel,
      )
      .setAlias('WILL')
      .setName('Will')
      .setLevelCost(5),
    hp = new ResourceAttributeEntity()
      .setDependency(
        (char: { primary: PrimaryAttributesEntity }) =>
          char.primary.st.totalLevel,
      )
      .setAlias('HP')
      .setName('Hit Points')
      .setLevelCost(2),
    fp = new ResourceAttributeEntity()
      .setDependency(
        (char: { primary: PrimaryAttributesEntity }) =>
          char.primary.ht.totalLevel,
      )
      .setAlias('FP')
      .setName('Fatigue Points')
      .setLevelCost(3),
    liftSt = new AttributeEntity()
      .setDependency(
        (char: { primary: PrimaryAttributesEntity }) =>
          char.primary.st.totalLevel,
      )
      .setAlias('LIFT_ST')
      .setName('Lift Strength')
      .setLevelCost(3),
    strikeSt = new AttributeEntity()
      .setDependency(
        (char: { primary: PrimaryAttributesEntity }) =>
          char.primary.st.totalLevel,
      )
      .setAlias('STRIKE_ST')
      .setName('Striking Strength')
      .setLevelCost(5),
    basicSpeed = new AttributeEntity()
      .setDependency(
        (char: { primary: PrimaryAttributesEntity }) =>
          (char.primary.dx.totalLevel + char.primary.ht.totalLevel) / 4,
      )
      .setAlias('BS')
      .setName('Basic Speed')
      .setLevelCost(5)
      .setLevelIncrease(0.25),
    basicMove = new AttributeEntity()
      .setDependency(
        (char: { secondary: SecondaryAttributesEntity }) =>
          char.secondary.basicSpeed.totalLevel,
      )
      .setAlias('Move')
      .setName('Basic Move')
      .setLevelCost(5),
  }: {
    per?: AttributeEntity;
    will?: AttributeEntity;
    hp?: ResourceAttributeEntity;
    fp?: ResourceAttributeEntity;
    liftSt?: AttributeEntity;
    strikeSt?: AttributeEntity;
    basicSpeed?: AttributeEntity;
    basicMove?: AttributeEntity;
  } = {}) {
    this.setPer(per, true)
      .setWill(will, true)
      .setHP(hp, true)
      .setFP(fp, true)
      .setLiftSt(liftSt, true)
      .setStrikeSt(strikeSt, true)
      .setBasicSpeed(basicSpeed, true)
      .setBasicMove(basicMove, true);
  }

  setPer(per: AttributeEntity, copy: boolean = false): this {
    if (copy) {
      this.per = new AttributeEntity(per);
    } else {
      this.per = per;
    }
    return this;
  }

  setWill(will: AttributeEntity, copy: boolean = false): this {
    if (copy) {
      this.will = new AttributeEntity(will);
    } else {
      this.will = will;
    }
    return this;
  }

  setHP(hp: ResourceAttributeEntity, copy: boolean = false): this {
    if (copy) {
      this.hp = new ResourceAttributeEntity(hp);
    } else {
      this.hp = hp;
    }
    return this;
  }

  setFP(fp: ResourceAttributeEntity, copy: boolean = false): this {
    if (copy) {
      this.fp = new ResourceAttributeEntity(fp);
    } else {
      this.fp = fp;
    }
    return this;
  }

  setLiftSt(liftSt: AttributeEntity, copy: boolean = false): this {
    if (copy) {
      this.liftSt = new AttributeEntity(liftSt);
    } else {
      this.liftSt = liftSt;
    }
    return this;
  }

  setStrikeSt(strikeSt: AttributeEntity, copy: boolean = false): this {
    if (copy) {
      this.strikeSt = new AttributeEntity(strikeSt);
    } else {
      this.strikeSt = strikeSt;
    }
    return this;
  }

  setBasicSpeed(basicSpeed: AttributeEntity, copy: boolean = false): this {
    if (copy) {
      this.basicSpeed = new AttributeEntity(basicSpeed);
    } else {
      this.basicSpeed = basicSpeed;
    }
    return this;
  }

  setBasicMove(basicMove: AttributeEntity, copy: boolean = false): this {
    if (copy) {
      this.basicMove = new AttributeEntity(basicMove);
    } else {
      this.basicMove = basicMove;
    }
    return this;
  }
}
