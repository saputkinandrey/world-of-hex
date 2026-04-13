import { Body, Controller, Delete, Get, NotFoundException, Param, Post } from '@nestjs/common';

import { ApiTags } from '@nestjs/swagger';

import { PostNewPlayerBodyDto } from '../dto/players/post-new-player-body.dto';
import { PlayerRepository } from '../../player/repositories/player.repository';
import { PostOwnAShipBodyDto } from '../dto/player/post-own-a-ship-body.dto';
import { ShipRepository } from '../repositories/ship.repository';
import { PlayerService } from '../../player/services/player.service';
import { EncounterService } from '../services/encounter.service';
import { PostJoinEncounterBodyDto } from '../dto/player/post-join-encounter-body.dto';
import { EncounterRepository } from '../repositories/encounter.repository';
import { PendingIntentRepository } from '../repositories/pending-intent.repository';
import { EncounterActorType } from '../types/pending-intent.type';

// @ApiBearerAuth()
// @Roles(RoleEnum.admin)
// @UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiTags('Sea-Combat-Players')
@Controller({
    path: 'sea-combat/players',
    // version: '1',
})
export class PlayersController {
    constructor(
        private readonly playerRepository: PlayerRepository,
        public readonly shipRepository: ShipRepository,
        public readonly playerService: PlayerService,
        public readonly encounterService: EncounterService,
        private readonly encounterRepository: EncounterRepository,
        private readonly pendingIntentRepository: PendingIntentRepository,
    ) {}

    @Post(':playerId/own-a-ship')
    async postOwnAShip(@Param('playerId') playerId: string, @Body() body: PostOwnAShipBodyDto) {
        const player = await this.playerRepository.findOneById(playerId);
        if (!player) {
            throw new NotFoundException(`Player with id ${playerId} not found`);
        }

        const ship = await this.shipRepository.findOneById(body.shipId);
        if (!ship) {
            throw new NotFoundException(`Ship with id ${body.shipId} not found`);
        }

        await this.playerService.ownAShip(player, ship);
        return { ok: true };
    }

    @Post(':playerId/join-encounter')
    async postJoinEncounter(@Param('playerId') playerId: string, @Body() body: PostJoinEncounterBodyDto) {
        const player = await this.playerRepository.findOneById(playerId);
        if (!player) {
            throw new NotFoundException(`Player with id ${playerId} not found`);
        }

        await this.encounterService.playerJoinsEncounter(player, body.encounterId);
        return { ok: true };
    }

    @Post(':playerId/leave-encounter')
    async postLeaveEncounter(@Param('playerId') playerId: string, @Body() body: PostJoinEncounterBodyDto) {
        const player = await this.playerRepository.findOneById(playerId);
        if (!player) {
            throw new NotFoundException(`Player with id ${playerId} not found`);
        }

        await this.encounterService.playerLeaveEncounter(player, body.encounterId);
        return { ok: true };
    }

    @Delete(':playerId/own-a-ship/:shipId')
    async deleteOwnedShip(@Param('playerId') playerId: string, @Param('shipId') shipId: string) {
        const player = await this.playerRepository.findOneById(playerId);
        if (!player) {
            throw new NotFoundException(`Player with id ${playerId} not found`);
        }
        await this.playerService.unownShip(player, shipId);
        return { ok: true };
    }

    @Delete(':playerId')
    async deletePlayer(@Param('playerId') playerId: string) {
        const player = await this.playerRepository.findOneById(playerId);
        if (!player) {
            throw new NotFoundException(`Player with id ${playerId} not found`);
        }

        const encounterCleanup = await this.encounterRepository.removePlayerReferencesFromAll(playerId);
        const pendingIntentCleanup = await this.pendingIntentRepository.cancelActorIntents(
            playerId,
            EncounterActorType.PLAYER,
            `Actor ${playerId} was deleted`,
        );
        const deletedPlayer = await this.playerRepository.deleteById(playerId);
        if (!deletedPlayer) {
            throw new NotFoundException(`Player with id ${playerId} not found`);
        }

        return {
            playerId,
            removedEncounterPlayerEntries: encounterCleanup.removedPlayerEntries,
            cancelledPendingIntents: pendingIntentCleanup.modifiedCount ?? 0,
        };
    }

    @Post()
    postNewPlayer(@Body() body: PostNewPlayerBodyDto) {
        return this.playerRepository
            .create({
                name: body.name,
                ownedShips: [],
            })
            .then((res) => res.toJSON());
    }

    @Get('list')
    getList() {
        return this.playerRepository.find({}, {}, { sort: { createdAt: -1 } }).then((result) => {
            return result.map((document) => document.toJSON());
        });
    }
}
