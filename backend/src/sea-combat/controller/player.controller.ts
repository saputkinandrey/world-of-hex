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
import { PlayerService } from '../../player/services/player.service';

// @ApiBearerAuth()
// @Roles(RoleEnum.admin)
// @UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiTags('Sea-Combat-Player')
@Controller({
  path: 'sea-combat/user-connected/:playerId',
  // version: '1',
})
export class PlayerController {
  constructor(
    public readonly encounterService: EncounterService,
    public readonly playerRepository: PlayerRepository,
    public readonly shipRepository: ShipRepository,
    public readonly playerService: PlayerService,
  ) {}

  @Post('join-encounter')
  async postJoinEncounter(
    @Param('playerId') playerId: string,
    @Body() body: PostJoinEncounterBodyDto,
  ) {
    const player = await this.playerRepository.findOneById(playerId);
    if (!player) {
      throw new NotFoundException(`Player with id ${playerId} not found`);
    }
    await this.encounterService.playerJoinsEncounter(player, body.encounterId);
  }

  @Post('leave-encounter')
  async postLeaveEncounter(
    @Param('encounterId') encounterId: string,
    @Param('playerId') playerId: string,
    @Body() body: PostLeaveEncounterBodyDto,
  ) {
    const player = await this.playerRepository.findOneById(playerId);
    if (!player) {
      throw new NotFoundException(`Player with id ${playerId} not found`);
    }
    await this.encounterService.playerLeaveEncounter(player, body.encounterId);
  }
}
