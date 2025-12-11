import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';

import { ApiTags } from '@nestjs/swagger';

import { PostNewPlayerBodyDto } from '../dto/players/post-new-player-body.dto';
import { PlayerRepository } from '../../player/repositories/player.repository';
import { PostOwnAShipBodyDto } from '../dto/player/post-own-a-ship-body.dto';
import { ShipRepository } from '../repositories/ship.repository';
import { PlayerService } from '../../player/services/player.service';

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
  ) {}

  @Post(':playerId/own-a-ship')
  async postOwnAShip(
    @Param('playerId') playerId: string,
    @Body() body: PostOwnAShipBodyDto,
  ) {
    const player = await this.playerRepository.findOneById(playerId);
    if (!player) {
      throw new NotFoundException(`Player with id ${playerId} not found`);
    }

    const ship = await this.shipRepository.findOneById(body.shipId);
    if (!ship) {
      throw new NotFoundException(`Ship with id ${body.shipId} not found`);
    }

    await this.playerService.ownAShip(player, ship);
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
    return this.playerRepository
      .find({}, {}, { sort: { createdAt: -1 } })
      .then((result) => {
        return result.map((document) => document.toJSON());
      });
  }
}
