import { Body, Controller, Delete, Get, NotFoundException, Param, Post } from '@nestjs/common';

import { ApiTags } from '@nestjs/swagger';

import { ShipRepository } from '../repositories/ship.repository';
import { PlayerRepository } from '../../player/repositories/player.repository';
import { PostNewShipBodyDto } from '../dto/ships/post-new-ship-body.dto';
import { EncounterRepository } from '../repositories/encounter.repository';

// @ApiBearerAuth()
// @Roles(RoleEnum.admin)
// @UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiTags('Sea-Combat-Ships')
@Controller({
    path: 'sea-combat/ships',
    // version: '1',
})
export class ShipsController {
    constructor(
        private readonly shipRepository: ShipRepository,
        private readonly playerRepository: PlayerRepository,
        private readonly encounterRepository: EncounterRepository,
    ) {}

    @Post()
    postNewShip(@Body() body: PostNewShipBodyDto) {
        return this.shipRepository
            .create({
                name: body.name,
                type: body.type,
                speed: 5,
                tactics: body.tactics ?? 10,
            })
            .then((res) => res.toJSON());
    }

    @Get('list')
    getList() {
        return this.shipRepository.find({}, {}, { sort: { createdAt: -1 } }).then((result) => {
            return result.map((document) => document.toJSON());
        });
    }

    @Delete(':shipId')
    async deleteShip(@Param('shipId') shipId: string) {
        const ship = await this.shipRepository.findOneById(shipId);
        const owner = ship ? await this.playerRepository.findOwnerByShipId(shipId) : null;
        const remainingOwnedShipIds =
            owner?.ownedShips
                ?.map((owned) => owned._id?.toString())
                .filter((ownedShipId): ownedShipId is string => Boolean(ownedShipId && ownedShipId !== shipId)) ?? [];

        if (ship) {
            await this.shipRepository.deleteById(shipId);
        }

        const playerCleanup = await this.playerRepository.removeShipFromAll(shipId);
        const encounterCleanup = await this.encounterRepository.removeShipReferencesFromAll(shipId);
        const disconnectedPlayers = owner
            ? await this.encounterRepository.disconnectPlayerWithoutShips(owner._id.toString(), remainingOwnedShipIds)
            : 0;

        const cleanupCount =
            (playerCleanup.modifiedCount ?? 0) + encounterCleanup.removedShipEntries + disconnectedPlayers;

        if (!ship && cleanupCount === 0) {
            throw new NotFoundException(`Ship with id ${shipId} not found`);
        }
    }
}
