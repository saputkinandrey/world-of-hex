// src/character/character.entity.ts

import {
  CharacterInventory,
  InventoryType,
  ResourceType,
} from './inventory/character-inventory.entity';
import {
  SampleRoles,
  SocialRelationEntity,
} from '../social/entities/social-relation.entity';
import { TributePolicy } from '../social/types';
import { PrimaryAttributesEntity } from './attributes/primary-attributes.entity';
import { SecondaryAttributesEntity } from './attributes/secondary-attributes.entity';

interface Inventory {
  [key: string]: number;
}

export class CharacterEntity {
  id?: string;
  name?: string;

  tributePolicy?: TributePolicy;
  inventory: CharacterInventory;

  primary: PrimaryAttributesEntity;
  secondary: SecondaryAttributesEntity;

  socialRelations: SocialRelationEntity[] = [];

  // 💰 экономика
  privateInventory: Inventory = {}; // личное владение
  sharedInventory: Inventory = {}; // общественные ресурсы

  // --- Новые социальные параметры ---
  leader: CharacterEntity | null = null;
  subordinates: CharacterEntity[] = [];
  leadership: number = 10; // аналог навыка Leadership из GURPS
  charisma: number = 0;
  reputation: number = 0.0;
  perceivedRespect: number = 0;
  morale: number = 0;

  constructor({
    name = '',
    primary = new PrimaryAttributesEntity(),
    secondary = new SecondaryAttributesEntity(),
  }: {
    name?: string;
    primary?: PrimaryAttributesEntity;
    secondary?: SecondaryAttributesEntity;
  } = {}) {
    this.setName(name).setPrimary(primary, true).setSecondary(secondary, true);
  }

  setName(name: string): this {
    this.name = name;
    return this;
  }

  setPrimary(primary: PrimaryAttributesEntity, copy = false): this {
    this.primary = copy ? new PrimaryAttributesEntity(primary) : primary;
    return this;
  }

  setSecondary(secondary: SecondaryAttributesEntity, copy = false): this {
    this.secondary = copy
      ? new SecondaryAttributesEntity(secondary)
      : secondary;
    return this;
  }

  // 📦 инвентарь
  addResource(inventory: InventoryType, type: ResourceType, amount: number) {
    const inv =
      inventory === InventoryType.PRIVATE
        ? this.privateInventory
        : this.sharedInventory;
    inv[type] = (inv[type] || 0) + amount;
  }

  removeResource(inventory: InventoryType, type: ResourceType, amount: number) {
    const inv =
      inventory === InventoryType.PRIVATE
        ? this.privateInventory
        : this.sharedInventory;
    inv[type] = Math.max(0, (inv[type] || 0) - amount);
  }

  getResource(inventory: InventoryType, type: ResourceType): number {
    const inv =
      inventory === InventoryType.PRIVATE
        ? this.privateInventory
        : this.sharedInventory;
    return inv[type] || 0;
  }

  getRelationWith(id?: string): SocialRelationEntity {
    if (!id) {
      throw new Error('id is required');
    }
    return SampleRoles.daughter;
  }

  // --- Социальная логика ---

  get subordinateLimit(): number {
    return 1 + Math.floor((this.leadership + this.charisma) / 2);
  }

  canHaveMoreSubordinates(): boolean {
    return this.subordinates.length < this.subordinateLimit;
  }

  addSubordinate(
    subordinate: CharacterEntity,
    relation: SocialRelationEntity,
  ): boolean {
    if (!this.canHaveMoreSubordinates()) return false;
    if (this.subordinates.includes(subordinate)) return false;

    subordinate.leader = this;
    this.subordinates.push(subordinate);
    this.socialRelations.push(relation);

    return true;
  }

  removeSubordinate(subordinate: CharacterEntity): boolean {
    const index = this.subordinates.indexOf(subordinate);
    if (index === -1) return false;

    this.subordinates.splice(index, 1);
    subordinate.leader = null;
    // this.relationships = this.relationships.filter(
    //   (r) => r.subordinate !== subordinate,
    // );

    return true;
  }

  /**
   * Оценивает эффективность лидера с точки зрения подчинённых
   */
  evaluateLeadership(): number {
    if (this.subordinates.length === 0) return 1.0;

    // const satisfactionSum = this.relationships
    //   .filter((r) => r.leader === this)
    //   .reduce((acc, r) => acc + r.evaluateExpectations(), 0);
    //
    // return satisfactionSum / this.subordinates.length;
    return 1;
  }
}
