import { StoredEvent } from '@event-nest/core';
import { CreatureInstanceRoot } from './creature-instance.root';

const INSTANCE_ID = 'creature-instance-1';

const toStoredEvents = (root: CreatureInstanceRoot): StoredEvent[] => {
    return root.uncommittedEvents.map((event, index) => {
        const stored = StoredEvent.fromPublishedEvent(
            `event-${index + 1}`,
            root.id,
            CreatureInstanceRoot.name,
            event.payload,
            event.occurredAt,
        );
        stored.aggregateRootVersion = index + 1;
        return stored;
    });
};

describe('CreatureInstanceRoot', () => {
    it('creates renames and retires through runtime events', () => {
        const root = new CreatureInstanceRoot(INSTANCE_ID);
        root.create({
            creatureInstanceId: INSTANCE_ID,
            profileId: 'animal.mammal.primate.human',
            name: 'Ada',
            nutritionNeedsPerDay: {
                energyPerDay: 1,
                proteinPerDay: 1,
                waterPerDay: 1,
                massPerDayLb: 1,
            },
            consumptionPerTurn: {
                energy: 1,
                protein: 1,
                water: 1,
                massLb: 1,
            },
        });
        root.rename('Ada Lovelace');
        root.changeState({ hunger: 'low' });
        root.changeAffiliation('culture.a', 'owner.1', 'faction.1');
        root.retire();

        expect(root.name).toBe('Ada Lovelace');
        expect(root.state).toEqual({ hunger: 'low' });
        expect(root.cultureId).toBe('culture.a');
        expect(root.status).toBe('retired');
        expect(root.uncommittedEvents).toHaveLength(5);
    });

    it('replays stored events into the same projection snapshot', () => {
        const live = new CreatureInstanceRoot(INSTANCE_ID);
        live.create({
            creatureInstanceId: INSTANCE_ID,
            profileId: 'animal.mammal.primate.human',
            name: 'Ada',
            nutritionNeedsPerDay: {
                energyPerDay: 1,
                proteinPerDay: 1,
                waterPerDay: 1,
                massPerDayLb: 1,
            },
            consumptionPerTurn: {
                energy: 1,
                protein: 1,
                water: 1,
                massLb: 1,
            },
            source: 'admin',
            reason: 'seed',
        });
        live.rename('Renamed', 'admin', 'fix');

        const replayed = new CreatureInstanceRoot(INSTANCE_ID);
        replayed.reconstitute(toStoredEvents(live));

        expect(replayed.name).toBe(live.name);
        expect(replayed.profileId).toBe(live.profileId);
        expect(replayed.status).toBe(live.status);
        expect(replayed.state).toEqual(live.state);
        expect(replayed.timelineVersion).toBe(2);
    });
});
