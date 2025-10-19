import { Body, Controller, Get, Post } from '@nestjs/common';

import { ApiTags } from '@nestjs/swagger';

import { ShipRepository } from '../repositories/ship.repository';
import { PostNewShipBodyDto } from '../dto/ships/post-new-ship-body.dto';

// @ApiBearerAuth()
// @Roles(RoleEnum.admin)
// @UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiTags('Sea-Combat-Ships')
@Controller({
  path: 'sea-combat/ships',
  // version: '1',
})
export class ShipsController {
  constructor(private readonly shipRepository: ShipRepository) {}

  @Post()
  postNewShip(@Body() body: PostNewShipBodyDto) {
    return this.shipRepository
      .create({
        name: body.name,
        type: body.type,
        speed: 5,
      })
      .then((res) => res.toJSON());
  }

  @Get('list')
  getList() {
    return this.shipRepository
      .find({}, {}, { sort: { createdAt: -1 } })
      .then((result) => {
        return result.map((document) => document.toJSON());
      });
  }
}
