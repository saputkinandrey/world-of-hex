import { PrimaryAttributesEntity } from './primary-attributes.entity';
import { SecondaryAttributesEntity } from './secondary-attributes.entity';
import { ResourceAttributeEntity } from './resource-attribute.entity';

export class CharacterEntity {
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
   * @returns {CharacterEntity}
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
   * @returns {CharacterEntity}
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

const Alice = new CharacterEntity({
  secondary: new SecondaryAttributesEntity({
    hp: new ResourceAttributeEntity({
      currentLevel: 15,
    }),
  }),
});

const Bob = new CharacterEntity({
  secondary: {
    hp: Alice.secondary.hp,
  },
});
