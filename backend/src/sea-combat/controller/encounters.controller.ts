import { Body, Controller, Get, Post } from '@nestjs/common';

import { ApiTags } from '@nestjs/swagger';

import { EncounterRepository } from '../repositories/encounter.repository';
import { PostNewEncounterBodyDto } from '../dto/encounters/post-new-encounter-body.dto';

// @ApiBearerAuth()
// @Roles(RoleEnum.admin)
// @UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiTags('Sea-Combat-Encounters')
@Controller({
  path: 'sea-combat/encounters',
  // version: '1',
})
export class EncountersController {
  constructor(private readonly encounterRepository: EncounterRepository) {}

  @Post()
  postNewEncounter(@Body() body: PostNewEncounterBodyDto) {
    return this.encounterRepository
      .create({
        players: [],
        ships: [],
        radius: body.radius,
        name: body.name,
      })
      .then((res) => res.toJSON());
  }

  @Get('list')
  getList() {
    return this.encounterRepository
      .find({}, {}, { sort: { createdAt: -1 } })
      .then((result) => {
        return result.map((document) => document.toJSON());
      });
  }
}
