import { AttributeEntity } from './attribute.entity';
import { ResourceAttributeEntity } from './resource-attribute.entity';
import { PrimaryAttributesEntity } from './primary-attributes.entity';

export class SecondaryAttributesEntity {
  /**
   *
   * @param {AttributeEntity} per
   * @param {AttributeEntity} will
   * @param {ResourceAttributeEntity} hp
   * @param {ResourceAttributeEntity} fp
   * @param {AttributeEntity} liftSt
   * @param {AttributeEntity} strikeSt
   * @param {AttributeEntity} basicSpeed
   * @param {AttributeEntity} basicMove
   */
  constructor({
    per = new AttributeEntity()
      .setDependency((char) => char.primary.iq.totalLevel)
      .setAlias('PER')
      .setName('Perception')
      .setLevelCost(5),
    will = new AttributeEntity()
      .setDependency((char) => char.primary.iq.totalLevel)
      .setAlias('WILL')
      .setName('Will')
      .setLevelCost(5),
    hp = new ResourceAttributeEntity()
      .setDependency((char) => char.primary.st.totalLevel)
      .setAlias('HP')
      .setName('Hit Points')
      .setLevelCost(2),
    fp = new ResourceAttributeEntity()
      .setDependency((char) => char.primary.ht.totalLevel)
      .setAlias('FP')
      .setName('Fatigue Points')
      .setLevelCost(3),
    liftSt = new AttributeEntity()
      .setDependency((char) => char.primary.st.totalLevel)
      .setAlias('LIFT_ST')
      .setName('Lift Strength')
      .setLevelCost(3),
    strikeSt = new AttributeEntity()
      .setDependency((char) => char.primary.st.totalLevel)
      .setAlias('STRIKE_ST')
      .setName('Striking Strength')
      .setLevelCost(5),
    basicSpeed = new AttributeEntity()
      .setDependency(
        (char) => (char.primary.dx.totalLevel + char.primary.ht.totalLevel) / 4,
      )
      .setAlias('BS')
      .setName('Basic Speed')
      .setLevelCost(5)
      .setLevelIncrease(0.25),
    basicMove = new AttributeEntity()
      .setDependency((char) => char.secondary.basicSpeed.totalLevel)
      .setAlias('Move')
      .setName('Basic Move')
      .setLevelCost(5),
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

  /**
   *
   * @param per {AttributeEntity}
   * @param copy {boolean}
   * @returns {SecondaryAttributesEntity}
   */
  setPer(per, copy = false) {
    if (copy) {
      this.per = new AttributeEntity(per);
    } else {
      this.per = per;
    }
    return this;
  }

  /**
   *
   * @param will {AttributeEntity}
   * @param copy {boolean}
   * @returns {SecondaryAttributesEntity}
   */
  setWill(will, copy = false) {
    if (copy) {
      this.will = new AttributeEntity(will);
    } else {
      this.will = will;
    }
    return this;
  }

  /**
   *
   * @param hp {ResourceAttributeEntity}
   * @param copy {boolean}
   * @returns {SecondaryAttributesEntity}
   */
  setHP(hp, copy = false) {
    if (copy) {
      this.hp = new ResourceAttributeEntity(hp);
    } else {
      this.hp = hp;
    }
    return this;
  }

  /**
   *
   * @param fp {ResourceAttributeEntity}
   * @param copy {boolean}
   * @returns {SecondaryAttributesEntity}
   */
  setFP(fp, copy = false) {
    if (copy) {
      this.fp = new ResourceAttributeEntity(fp);
    } else {
      this.fp = fp;
    }
    return this;
  }

  /**
   *
   * @param liftSt {AttributeEntity}
   * @param copy {boolean}
   * @returns {SecondaryAttributesEntity}
   */
  setLiftSt(liftSt, copy = false) {
    if (copy) {
      this.liftSt = new AttributeEntity(liftSt);
    } else {
      this.liftSt = liftSt;
    }
    return this;
  }

  /**
   *
   * @param strikeSt {AttributeEntity}
   * @param copy {boolean}
   * @returns {SecondaryAttributesEntity}
   */
  setStrikeSt(strikeSt, copy = false) {
    if (copy) {
      this.strikeSt = new AttributeEntity(strikeSt);
    } else {
      this.strikeSt = strikeSt;
    }
    return this;
  }

  /**
   *
   * @param basicSpeed {AttributeEntity}
   * @param copy {boolean}
   * @returns {SecondaryAttributesEntity}
   */
  setBasicSpeed(basicSpeed, copy = false) {
    if (copy) {
      this.basicSpeed = new AttributeEntity(basicSpeed);
    } else {
      this.basicSpeed = basicSpeed;
    }
    return this;
  }

  /**
   *
   * @param basicMove {AttributeEntity}
   * @param copy {boolean}
   * @returns {SecondaryAttributesEntity}
   */
  setBasicMove(basicMove, copy = false) {
    if (copy) {
      this.basicMove = new AttributeEntity(basicMove);
    } else {
      this.basicMove = basicMove;
    }
    return this;
  }
}
