import { BadRequestException } from '@nestjs/common';
import { CreatureManagementController } from './creature-management.controller';
import { CreatureManagementService } from '../services/creature-management.service';

describe('CreatureManagementController', () => {
    it('rejects individual creation when service validates profile as invalid', async () => {
        const service = {
            adminCreateIndividual: jest
                .fn()
                .mockRejectedValue(
                    new BadRequestException('Creature profile plant.grass cannot create an individual instance'),
                ),
        } as unknown as CreatureManagementService;

        const controller = new CreatureManagementController(service);

        await expect(
            controller.createIndividual({
                profileId: 'plant.grass',
                name: 'Grass Clump',
            }),
        ).rejects.toBeInstanceOf(BadRequestException);
    });
});
