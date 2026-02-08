import { Body, Controller, Get, Post } from '@nestjs/common';

import { ApiTags } from '@nestjs/swagger';

import { EncounterService } from '../services/encounter.service';
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
    constructor(private readonly encounterService: EncounterService) {}

    @Post()
    postNewEncounter(@Body() body: PostNewEncounterBodyDto) {
        return this.encounterService.createEncounter(body.name, body.radius).then((res) => res.toJSON());
    }

    @Get('list')
    getList() {
        return this.encounterService.findAllEncounters().then((result) => result.map((document) => document.toJSON()));
    }
}
