export type WeaponAttack = {
    readonly bonus: number;
    readonly type: "cr" | "cut" | "imp";
};

export type WeaponDamage = {
    readonly thrust: WeaponAttack;
    readonly swing?: WeaponAttack;
    readonly thrownThrust?: WeaponAttack;
};

export type WeaponRange = {
    readonly accuracy: number;
    readonly halfDamageMultiplier: number;
    readonly maxMultiplier: number;
};

export type WeaponRule =
    | {
          readonly id: "deforms-on-hit";
      }
    | {
          readonly id: "sticks-in-nonmetallic-shield";
      };

export type Weapon = {
    readonly id: string;
    readonly name: string;
    readonly gurpsEquivalent: string;
    readonly damage: WeaponDamage;
    readonly reach: readonly number[];
    readonly range: WeaponRange | null;
    readonly rules: readonly WeaponRule[];
    readonly weightLb: number;
    readonly cost: number;
    readonly minimumStrength: number;
};

export type ShieldRule = {
    readonly id: "shield-wall-db-bonus";
    readonly bonus: number;
};

export type Shield = {
    readonly id: string;
    readonly name: string;
    readonly gurpsEquivalent: string;
    readonly defenseBonus: number;
    readonly damageResistance: number;
    readonly hitPoints: number;
    readonly coverDamageResistance: number;
    readonly weightLb: number;
    readonly cost: number;
    readonly rules: readonly ShieldRule[];
};

export type ArmorLocation =
    | "left-arm"
    | "skull"
    | "face"
    | "torso"
    | "upper-chest"
    | "groin"
    | "shoulders"
    | "thighs"
    | "left-shin"
    | "right-shin";

export type ArmorRule =
    | { readonly id: "face-front-protection"; readonly frequency: string }
    | { readonly id: "front-vitals-protection" }
    | { readonly id: "crushing-dr"; readonly damageResistance: number }
    | { readonly id: "vision-noticeability-bonus"; readonly bonus: number };

export type ArmorItem = {
    readonly id: string;
    readonly name: string;
    readonly gurpsEquivalent: string;
    readonly damageResistance: number;
    readonly locations: readonly ArmorLocation[];
    readonly weightLb: number;
    readonly cost: number;
    readonly rules: readonly ArmorRule[];
};

export type ArmorLoadout = {
    readonly id: string;
    readonly name: string;
    readonly items: readonly string[];
    readonly weightLb: number;
    readonly cost: number;
};

export type LegionaryLoadout = {
    readonly id: string;
    readonly name: string;
    readonly armorLoadoutId: string;
    readonly shieldId: string;
    readonly weaponIds: readonly string[];
    readonly clothing: readonly string[];
    readonly weightLb: number;
    readonly cost: number;
};

export type EquipmentDefinitionBase = {
    readonly id: string;
    readonly name: string;
    readonly tags: readonly string[];
    readonly weightLb?: number;
    readonly cost?: number;
    readonly gurpsEquivalent?: string;
    readonly quality?: EquipmentQuality;
};

export interface EquipmentQuality {
    readonly attackMinimum?: number;
    readonly defenseMinimum?: number;
}

export interface FirearmProfile {
    readonly damage: FirearmDamage;
    readonly minimumRange: number;
    readonly maximumRange: number;
    readonly skill: string;
    readonly aim: boolean;
    readonly attachmentSlots?: readonly string[];
}

export interface FirearmDamage {
    readonly dice: number;
    readonly modifier: number;
    readonly type: "cr" | "cut" | "imp";
}

export interface WeaponAttachment {
    readonly verb: "bayonet";
    readonly id: string;
    readonly slot: string;
    readonly compatibleWeaponIds: readonly string[];
    readonly name: string;
    readonly weapon: WeaponItem;
}

export type WeaponItem = EquipmentDefinitionBase &
    Omit<
        Weapon,
        "weightLb" | "cost" | "gurpsEquivalent" | "minimumStrength"
    > & {
        readonly kind: "weapon";
        readonly handsRequired: 1 | 2;
        readonly defaultAttack?: "thrust" | "swing";
        readonly attackSkills?: WeaponAttackSkills;
        readonly minimumStrength?: number;
        readonly firearm?: FirearmProfile;
    };

export interface WeaponAttackSkills {
    readonly thrust: string;
    readonly swing?: string;
    readonly throw?: string;
}

export type ShieldGrip = "fist" | "strapped";

export type ShieldItem = EquipmentDefinitionBase & {
    readonly kind: "shield";
    readonly bash?: WeaponAttack;
    readonly grip?: ShieldGrip;
    readonly defenseBonus: number;
    readonly damageResistance?: number;
    readonly hitPoints?: number;
    readonly coverDamageResistance?: number;
    readonly rules: readonly ShieldRule[];
};

export type ArmorEquipmentItem = EquipmentDefinitionBase &
    Omit<ArmorItem, "weightLb" | "cost" | "gurpsEquivalent"> & {
        readonly kind: "armor";
    };

export type GearItem = EquipmentDefinitionBase & {
    readonly kind: "gear";
};

export type EquipmentItem =
    | WeaponItem
    | ShieldItem
    | ArmorEquipmentItem
    | GearItem;

export type EquipmentPlacement =
    | "main-hand"
    | "off-hand"
    | "both-hands"
    | "worn"
    | "carried";

export type EquipmentLoadoutEntry = {
    readonly instanceId?: string;
    readonly itemId: string;
    readonly quantity: number;
    readonly placement: EquipmentPlacement;
    readonly loaded?: boolean;
    readonly attachments?: readonly WeaponAttachment[];
};

export type EquipmentPreset = {
    readonly id: string;
    readonly name: string;
    readonly items: readonly EquipmentLoadoutEntry[];
};

export type ResolvedEquipmentEntry = EquipmentLoadoutEntry & {
    readonly item: EquipmentItem;
};
