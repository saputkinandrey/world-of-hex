import { ConflictException } from '@nestjs/common';
import { CreatureManagementService } from './creature-management.service';
import { CreatureInstanceVersionConflictError } from '../domain/creature-management.errors';

describe('CreatureManagementService admin CRUD', () => {
    const makeService = (overrides: Record<string, unknown> = {}) => {
        const instanceRepository = {
            create: jest.fn(async (instance) => instance),
            loadById: jest.fn(),
            findAll: jest.fn(async () => []),
            saveWithVersion: jest.fn(),
            replaceProjection: jest.fn(),
            deleteById: jest.fn(),
            ...(overrides.instanceRepository as object),
        };
        const profileValidation = {
            assertCanCreateIndividual: jest.fn(() => ({
                id: 'animal.mammal.primate.human',
                name: 'Human',
                defaultActorName: 'Human',
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
            })),
            assertCanCreateCohort: jest.fn(),
            resolveEffective: jest.fn((profileId: string) => ({
                id: profileId,
                name: profileId === 'plant.grass' ? 'Grass' : 'Human',
                defaultActorName: profileId === 'plant.grass' ? 'Grass' : 'Human',
            })),
            listProfileOptions: jest.fn(() => []),
            ...(overrides.profileValidation as object),
        };
        const populationCohortService = {
            listCohorts: jest.fn(async () => []),
            getSyncRegistry: jest.fn(),
            createSubstrate: jest.fn(),
            createCohort: jest.fn(),
            loadCohort: jest.fn(),
            saveCohortWithVersion: jest.fn(),
            retireCohort: jest.fn(),
            retireSubstrateIfEmpty: jest.fn(),
            ...(overrides.populationCohortService as object),
        };

        const service = new CreatureManagementService(
            { addPublisher: jest.fn((root) => root) } as never,
            instanceRepository as never,
            { findByCreatureInstanceId: jest.fn(async () => []) } as never,
            { findByCohortId: jest.fn(async () => []) } as never,
            profileValidation as never,
            populationCohortService as never,
        );

        return { service, instanceRepository, profileValidation, populationCohortService };
    };

    it('creates an individual with admin markers without timeline by default', async () => {
        const { service, instanceRepository, profileValidation } = makeService();
        const created = await service.adminCreateIndividual({
            profileId: 'animal.mammal.primate.human',
            name: 'Ada',
        });

        expect(profileValidation.assertCanCreateIndividual).toHaveBeenCalledWith('animal.mammal.primate.human');
        expect(instanceRepository.create).toHaveBeenCalled();
        expect(created.name).toBe('Ada');
        expect(created.lastEditedBy).toBe('admin');
        expect(created.timelineVersion).toBe(0);
        expect(created.projectionVersion).toBe(1);
        expect(created.state._derived).toMatchObject({
            profileId: 'animal.mammal.primate.human',
            attributes: { st: 10 },
        });
        expect(created.nutritionNeedsPerDay.massPerDayLb).toBeGreaterThan(0);
    });

    it('creates a cohort with an explicit name', async () => {
        const { service, profileValidation, populationCohortService } = makeService({
            profileValidation: {
                assertCanCreateCohort: jest.fn(() => ({
                    id: 'plant.grass',
                    name: 'Grass',
                    defaultActorName: 'Grass',
                })),
                resolveEffective: jest.fn(() => ({
                    id: 'plant.grass',
                    name: 'Grass',
                    defaultActorName: 'Grass',
                })),
            },
            populationCohortService: {
                getSyncRegistry: jest.fn(() => ({
                    get: () => ({ stateScope: [] }),
                })),
                createSubstrate: jest.fn(async (substrate) => substrate),
                createCohort: jest.fn(async (cohort) => cohort),
            },
        });

        const created = await service.adminCreateCohort({
            profileId: 'plant.grass',
            cohortKind: 'field',
            name: 'Meadow patch',
            quantity: { kind: 'count', count: 10 },
        });

        expect(profileValidation.assertCanCreateCohort).toHaveBeenCalledWith('plant.grass');
        expect(populationCohortService.createCohort).toHaveBeenCalled();
        expect(created.name).toBe('Meadow patch');
        const derived = created.state._derived as {
            attributes: { st: number };
            nutritionNeedsPerDay: { massPerDayLb: number };
        };
        expect(derived.attributes.st).toBeGreaterThan(0);
        // Totals are scaled by count; per-member base remains in _derived.
        expect(created.nutritionNeedsPerDay.massPerDayLb).toBe(derived.nutritionNeedsPerDay.massPerDayLb * 10);
    });

    it('maps projection version conflicts to HTTP 409', async () => {
        const { service, instanceRepository } = makeService({
            instanceRepository: {
                loadById: jest.fn(async () => ({
                    creatureInstanceId: 'id-1',
                    profileId: 'animal.mammal.primate.human',
                    name: 'Ada',
                    state: {},
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
                    timelineVersion: 0,
                    projectionVersion: 2,
                    status: 'active',
                })),
                saveWithVersion: jest.fn(async () => {
                    throw new CreatureInstanceVersionConflictError('id-1', 1);
                }),
            },
        });

        await expect(
            service.adminUpdateIndividual({
                creatureInstanceId: 'id-1',
                expectedProjectionVersion: 1,
                name: 'Updated',
            }),
        ).rejects.toBeInstanceOf(ConflictException);
        expect(instanceRepository.saveWithVersion).toHaveBeenCalled();
    });

    it('recalculates individual derived state and nutrition from profile', async () => {
        const existingState = {
            hunger: 'low',
            _derived: {
                profileId: 'lizard.generic',
                nutritionNeedsPerDay: {
                    energyPerDay: 0,
                    proteinPerDay: 0,
                    waterPerDay: 0,
                    massPerDayLb: 0.00125,
                },
            },
        };
        const { service, instanceRepository } = makeService({
            instanceRepository: {
                loadById: jest.fn(async () => ({
                    creatureInstanceId: 'id-lizard',
                    profileId: 'lizard.generic',
                    cultureId: null,
                    ownerId: null,
                    factionId: null,
                    name: 'Lizard',
                    state: existingState,
                    nutritionNeedsPerDay: {
                        energyPerDay: 0,
                        proteinPerDay: 0,
                        waterPerDay: 0,
                        massPerDayLb: 0.00125,
                    },
                    consumptionPerTurn: {
                        energy: 0,
                        protein: 0,
                        water: 0,
                        massLb: 0.00005,
                    },
                    timelineVersion: 0,
                    projectionVersion: 3,
                    status: 'active',
                })),
                saveWithVersion: jest.fn(async (next) => ({
                    ...next,
                    projectionVersion: 4,
                })),
            },
        });

        const updated = await service.adminRecalculateIndividualState({
            creatureInstanceId: 'id-lizard',
            expectedProjectionVersion: 3,
        });

        expect(instanceRepository.saveWithVersion).toHaveBeenCalled();
        expect(updated.state.hunger).toBe('low');
        expect(updated.state._derived).toMatchObject({
            profileId: 'lizard.generic',
            attributes: { st: 0.7 },
        });
        expect(updated.nutritionNeedsPerDay.energyPerDay).toBeGreaterThan(0);
        expect(updated.nutritionNeedsPerDay.massPerDayLb).toBeGreaterThan(0);
        expect(updated.state._derived).toMatchObject({
            nutritionNeedsPerDay: {
                energyPerDay: expect.any(Number),
                massPerDayLb: expect.any(Number),
            },
        });
    });

    it('hard-deletes an individual projection for admin only', async () => {
        const { service, instanceRepository } = makeService({
            instanceRepository: {
                loadById: jest.fn(async () => ({
                    creatureInstanceId: 'id-1',
                    profileId: 'animal.mammal.primate.human',
                    name: 'Ada',
                    state: {},
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
                    timelineVersion: 0,
                    projectionVersion: 1,
                    status: 'retired',
                })),
                deleteById: jest.fn(async () => true),
            },
        });

        const result = await service.adminDeleteIndividual('id-1', 1, true);
        expect(result).toEqual({ deleted: true, instance: null });
        expect(instanceRepository.deleteById).toHaveBeenCalledWith('id-1');
        expect(instanceRepository.saveWithVersion).not.toHaveBeenCalled();
    });
});
