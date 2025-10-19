import { PrimaryAttributesEntity } from './attributes/legacy/primary-attributes.entity';
import { SecondaryAttributesEntity } from './attributes/legacy/secondary-attributes.entity';
import { ResourceAttributeEntity } from './attributes/legacy/resource-attribute.entity';

export class _characterEntity {
  /**
   *
   * @param {PrimaryAttributesEntity} primary
   * @param {SecondaryAttributesEntity} secondary
   */
  constructor({
    primary = new PrimaryAttributesEntity(),
    secondary = new SecondaryAttributesEntity(),
  } = {}) {
    this.setPrimary(primary, true).setSecondary(secondary, true);
  }

  /**
   *
   * @param {PrimaryAttributesEntity} primary
   * @param {boolean} copy
   * @returns {_characterEntity}
   */
  setPrimary(primary, copy = false) {
    if (copy) {
      this.primary = new PrimaryAttributesEntity(primary);
    } else {
      this.primary = primary;
    }
    return this;
  }
  /**
   *
   * @param {SecondaryAttributesEntity} secondary
   * @param {boolean} copy
   * @returns {_characterEntity}
   */
  setSecondary(secondary, copy = false) {
    if (copy) {
      this.secondary = new SecondaryAttributesEntity(secondary);
    } else {
      this.secondary = secondary;
    }
    return this;
  }
}

const Alice = new _characterEntity({
  secondary: new SecondaryAttributesEntity({
    hp: new ResourceAttributeEntity({
      currentLevel: 15,
    }),
  }),
});

const Bob = new _characterEntity({
  secondary: {
    hp: Alice.secondary.hp,
  },
});
