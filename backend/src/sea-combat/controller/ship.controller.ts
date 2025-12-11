import {
  Body,
  Controller,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';

import { ApiTags } from '@nestjs/swagger';

import { EncounterService } from '../services/encounter.service';
import { PlayerRepository } from '../../player/repositories/player.repository';
import { PostJoinEncounterBodyDto } from '../dto/player/post-join-encounter-body.dto';
import { PostLeaveEncounterBodyDto } from '../dto/player/post-leave-encounter-body.dto';
import { ShipRepository } from '../repositories/ship.repository';
import { PostShipChangeMovementDto } from '../dto/ship/post-ship-change-movement.dto';

// @ApiBearerAuth()
// @Roles(RoleEnum.admin)
// @UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiTags('Sea-Combat-Ship')
@Controller({
  path: 'sea-combat/ship/:shipId',
  // version: '1',
})
export class ShipController {
  constructor(
    public readonly encounterService: EncounterService,
    public readonly playerRepository: PlayerRepository,
    public readonly shipRepository: ShipRepository,
  ) {}

  @Post('join-encounter')
  async postJoinEncounter(
    @Param('shipId') shipId: string,
    @Body() body: PostJoinEncounterBodyDto,
  ) {
    const ship = await this.shipRepository.findOneById(shipId);
    if (!ship) {
      throw new NotFoundException(`Ship with id ${shipId} not found`);
    }

    const encounter = await this.encounterService.findOneById(body.encounterId);
    if (!encounter) {
      throw new NotFoundException(
        `Encounter with id ${body.encounterId} not found`,
      );
    }

    await this.encounterService.shipJoinsEncounter(ship, encounter);
  }

  @Post('leave-encounter')
  async postLeaveEncounter(
    @Param('encounterId') encounterId: string,
    @Param('playerId') playerId: string,
    @Body() body: PostLeaveEncounterBodyDto,
  ) {
    const ship = await this.shipRepository.findOneById(body.shipId);
    if (!ship) {
      throw new NotFoundException(`Ship with id ${body.shipId} not found`);
    }

    const encounter = await this.encounterService.findOneById(body.encounterId);
    if (!encounter) {
      throw new NotFoundException(
        `Encounter with id ${body.encounterId} not found`,
      );
    }
    await this.encounterService.shipLeavesEncounter(ship, encounter);
  }

  @Post('change-movement')
  async postChangegMovement(
    @Param('encounterId') encounterId: string,
    @Param('playerId') playerId: string,
    @Body() body: PostShipChangeMovementDto,
  ) {
    const encounter = await this.encounterService.findOneById(encounterId);
    if (!encounter) {
      throw new NotFoundException(`Encounter with id $encounterId} not found`);
    }

    const player = await this.playerRepository.findOneById(playerId);
    if (!player) {
      throw new NotFoundException(`Player with id ${playerId} not found`);
    }
  }
}
