import { CharacterEntity } from '../../character/character.entity';
import { SocialDutyTag } from '../types';
import { SampleRoles } from '../entities/social-relation.entity';
import {
    InventoryType,
    ResourceType,
} from '../../character/inventory/character-inventory.entity';

export class EconomySystem {
    static giveTribute(
        subordinate: CharacterEntity,
        leader: CharacterEntity,
        type: ResourceType,
    ) {
        const relation = leader.getRelationWith(subordinate.id);
        if (!relation) return;

        const tributeTag = relation.dutiesBeforeLeader.find(
            (d) => d.tag === SocialDutyTag.GIVE_TRIBUTE,
        );
        if (!tributeTag) return;

        const ratio = tributeTag.value; // 0–1
        const available = subordinate.getResource(
            InventoryType.PRIVATE,

            type,
        );
        const amount = available * ratio;

        if (amount > 0) {
            subordinate.removeResource(InventoryType.PRIVATE, type, amount);
            leader.addResource(InventoryType.SHARED, type, amount);
        }
    }

    static shareLootUp(
        subordinate: CharacterEntity,
        leader: CharacterEntity,
        type: ResourceType,
    ) {
        const relation = leader.getRelationWith(subordinate.id);
        if (!relation) return;

        const duty = relation.dutiesBeforeLeader.find(
            (d) => d.tag === SocialDutyTag.SHARE_LOOT_UP,
        );
        if (!duty) return;

        const ratio = duty.value;
        const available = subordinate.getResource(InventoryType.SHARED, type);
        const amount = available * ratio;

        if (amount > 0) {
            subordinate.removeResource(InventoryType.SHARED, type, amount);
            leader.addResource(InventoryType.SHARED, type, amount);
        }
    }

    static shareLootDown(leader: CharacterEntity, type: ResourceType) {
        for (const subordinate of leader.subordinates) {
            const relation = leader.getRelationWith(subordinate.id);
            if (!relation) continue;

            const duty = relation.dutiesBeforeSubordinates.find(
                (r) => r.tag === SocialDutyTag.SHARE_LOOT_DOWN,
            );
            if (!duty) continue;

            const ratio = duty.value;
            const available = leader.getResource(InventoryType.SHARED, type);
            const amount = (available * ratio) / leader.subordinates.length;

            if (amount > 0) {
                if (subordinate) {
                    leader.removeResource(InventoryType.SHARED, type, amount);
                    subordinate.addResource(InventoryType.SHARED, type, amount);
                }
            }
        }
    }
}

const matron = new CharacterEntity({ name: 'Матрона' });
const daughter = new CharacterEntity({ name: 'Дочь' });

matron.addSubordinate(daughter, SampleRoles.daughter);

// ресурсы
daughter.addResource(InventoryType.PRIVATE, ResourceType.FOOD, 100);
daughter.addResource(InventoryType.SHARED, ResourceType.MATERIALS, 50);
matron.addResource(InventoryType.SHARED, ResourceType.FOOD, 500);

console.log('— ДО ТРАНСФЕРОВ —');
console.log({ matron, daughter });

// отдаём дань и долю добычи
EconomySystem.giveTribute(daughter, matron, ResourceType.FOOD);
EconomySystem.shareLootUp(daughter, matron, ResourceType.MATERIALS);
EconomySystem.shareLootDown(matron, ResourceType.FOOD);

console.log('— ПОСЛЕ —');
console.log({ matron, daughter });
