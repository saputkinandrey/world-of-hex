import { Body, Controller, Delete, Get, NotFoundException, Param, Post } from '@nestjs/common';

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

    @Post(':encounterId/advance-turn')
    postAdvanceTurn(@Param('encounterId') encounterId: string) {
        return this.encounterService.requestAdvanceTurn(encounterId).then((request) => request.toJSON());
    }

    @Delete(':encounterId/pending-intents/:intentId')
    deletePendingIntent(@Param('encounterId') encounterId: string, @Param('intentId') intentId: string) {
        return this.encounterService.cancelPendingIntent(encounterId, intentId).then((intent) => intent.toJSON());
    }

    @Delete(':encounterId')
    deleteEncounter(@Param('encounterId') encounterId: string) {
        return this.encounterService.deleteEncounter(encounterId);
    }

    @Get('list')
    getList() {
        return this.encounterService.findAllEncounters().then((result) => result.map((document) => document.toJSON()));
    }

    @Get(':encounterId/view')
    async getView(@Param('encounterId') encounterId: string) {
        const encounter = await this.encounterService.findEncounterViewById(encounterId);
        if (!encounter) {
            throw new NotFoundException(`Encounter with id ${encounterId} not found`);
        }

        return encounter;
    }
}
