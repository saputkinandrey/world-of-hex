import { SocialRelationEntity } from '../entities/social-relation.entity';

export class SocialDynamicsSystem {
    static updateAfterEconomicAction(
        relation: SocialRelationEntity,
        action:
            | 'tribute_paid'
            | 'tribute_ignored'
            | 'loot_shared'
            | 'loot_denied',
    ) {
        switch (action) {
            case 'tribute_paid':
                relation.trust = Math.min(1, relation.trust + 0.02);
                break;
            case 'tribute_ignored':
                relation.fear = Math.min(1, relation.fear + 0.05);
                relation.trust = Math.max(0, relation.trust - 0.1);
                break;
            case 'loot_shared':
                relation.trust = Math.min(1, relation.trust + 0.03);
                relation.respect = Math.min(1, relation.respect + 0.02);
                break;
            case 'loot_denied':
                relation.trust = Math.max(0, relation.trust - 0.1);
                relation.respect = Math.max(0, relation.respect - 0.05);
                break;
        }
    }
}
//
// if (relation.loyalty < 0.4) {
//   if (Math.random() > relation.fear) {
//     console.log(`${subordinate.name} саботирует приказ ${leader.name}`);
//     effectiveOutput *= 0.75;
//   }
// }
//
// EconomySystem.shareLootDown(matron, 'food');
// SocialDynamicsSystem.updateAfterEconomicAction(relation, 'loot_shared');
//
// EconomySystem.giveTribute(daughter, matron, 'food');
// SocialDynamicsSystem.updateAfterEconomicAction(relation, 'tribute_paid');
//
// SocialDynamicsSystem.updateAfterEconomicAction(relation, 'loot_denied');
