import { CharacterEntity } from '../../character/character.entity';
import { SocialDutyTag, SocialRightTag } from '../types';
import { SocialRelationEntity } from '../entities/social-relation.entity';

export function getSocialBalance(
    roleA: SocialRelationEntity,
    roleB: SocialRelationEntity,
): number {
    const obedience =
        roleB.dutiesBeforeLeader.find(
            (d) => d.tag === SocialDutyTag.OBEY_ORDERS,
        )?.value ?? 0;
    const command =
        roleA.rightsOnSubordinates.find((r) => r.tag === SocialRightTag.COMMAND)
            ?.value ?? 0;
    return (obedience + command) / 2;
}

export function processTribute(subject: CharacterEntity) {
    const { tributePolicy } = subject;
    if (!tributePolicy) return;

    const tribute = subject.inventory.extractFraction(tributePolicy);
    subject.inventory.shared.push(...tribute);
}

export function performRespectRitual(
    subject: CharacterEntity,
    leader: CharacterEntity,
) {
    leader.perceivedRespect += 0.05;
    subject.morale += 0.02; // довольство, что "всё по правилам"
}
