import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
    AdminTimelineEventBodyDto,
    CreateCohortBodyDto,
    CreateIndividualBodyDto,
    DeleteCohortQueryDto,
    DeleteIndividualQueryDto,
    RecalculateCohortStateBodyDto,
    RecalculateIndividualStateBodyDto,
    RevertTimelineEventBodyDto,
    RuntimeAffiliationBodyDto,
    RuntimeRenameBodyDto,
    RuntimeRetireBodyDto,
    RuntimeStateBodyDto,
    UpdateCohortBodyDto,
    UpdateIndividualBodyDto,
} from '../dto/creature-management.dto';
import { CreatureManagementService } from '../services/creature-management.service';
import { CohortKind, CohortQuantity } from '../../world-population/domain/cohort.types';

@ApiTags('Creature-Management')
@Controller({
    path: 'creature-management',
})
export class CreatureManagementController {
    constructor(private readonly creatureManagementService: CreatureManagementService) {}

    @Get()
    listOverview() {
        return this.creatureManagementService.listOverview();
    }

    @Post('individuals')
    createIndividual(@Body() body: CreateIndividualBodyDto) {
        return this.creatureManagementService.adminCreateIndividual(body);
    }

    @Patch('individuals/:id')
    updateIndividual(@Param('id') id: string, @Body() body: UpdateIndividualBodyDto) {
        return this.creatureManagementService.adminUpdateIndividual({
            creatureInstanceId: id,
            ...body,
        });
    }

    @Post('individuals/:id/recalculate-state')
    recalculateIndividualState(@Param('id') id: string, @Body() body: RecalculateIndividualStateBodyDto) {
        return this.creatureManagementService.adminRecalculateIndividualState({
            creatureInstanceId: id,
            expectedProjectionVersion: body.expectedProjectionVersion,
            cultureId: body.cultureId,
        });
    }

    @Delete('individuals/:id')
    deleteIndividual(@Param('id') id: string, @Query() query: DeleteIndividualQueryDto) {
        return this.creatureManagementService.adminDeleteIndividual(
            id,
            query.expectedProjectionVersion,
            query.hardDelete ?? false,
        );
    }

    @Get('individuals/:id/timeline')
    getIndividualTimeline(@Param('id') id: string) {
        return this.creatureManagementService.getIndividualTimeline(id);
    }

    @Post('individuals/:id/timeline/events')
    appendIndividualTimelineEvent(@Param('id') id: string, @Body() body: AdminTimelineEventBodyDto) {
        return this.creatureManagementService.appendAdminIndividualTimelineEvent({
            id,
            ...body,
        });
    }

    @Post('individuals/:id/timeline/:eventId/revert')
    revertIndividualTimelineEvent(
        @Param('id') id: string,
        @Param('eventId') eventId: string,
        @Body() body: RevertTimelineEventBodyDto,
    ) {
        return this.creatureManagementService.revertIndividualTimelineEvent(id, eventId, body.reason);
    }

    @Post('individuals/:id/rebuild-projection')
    rebuildIndividualProjection(@Param('id') id: string) {
        return this.creatureManagementService.rebuildIndividualProjection(id);
    }

    @Get('individuals/:id/projection-diff')
    compareIndividualProjection(@Param('id') id: string) {
        return this.creatureManagementService.compareIndividualProjection(id);
    }

    @Post('cohorts')
    createCohort(@Body() body: CreateCohortBodyDto) {
        return this.creatureManagementService.adminCreateCohort({
            ...body,
            cohortKind: body.cohortKind as CohortKind,
            quantity: body.quantity as CohortQuantity,
        });
    }

    @Patch('cohorts/:id')
    updateCohort(@Param('id') id: string, @Body() body: UpdateCohortBodyDto) {
        return this.creatureManagementService.adminUpdateCohort({
            cohortId: id,
            ...body,
            quantity: body.quantity as CohortQuantity | undefined,
        });
    }

    @Post('cohorts/:id/recalculate-state')
    recalculateCohortState(@Param('id') id: string, @Body() body: RecalculateCohortStateBodyDto) {
        return this.creatureManagementService.adminRecalculateCohortState({
            cohortId: id,
            expectedVersion: body.expectedVersion,
            cultureId: body.cultureId,
        });
    }

    @Delete('cohorts/:id')
    deleteCohort(@Param('id') id: string, @Query() query: DeleteCohortQueryDto) {
        return this.creatureManagementService.adminDeleteCohort(id, query.expectedVersion, query.hardDelete ?? false);
    }

    @Get('cohorts/:id/timeline')
    getCohortTimeline(@Param('id') id: string) {
        return this.creatureManagementService.getCohortTimeline(id);
    }

    @Post('runtime/individuals/:id/commands/rename')
    runtimeRename(@Param('id') id: string, @Body() body: RuntimeRenameBodyDto) {
        return this.creatureManagementService.runtimeRenameIndividual({
            creatureInstanceId: id,
            ...body,
        });
    }

    @Post('runtime/individuals/:id/commands/change-state')
    runtimeChangeState(@Param('id') id: string, @Body() body: RuntimeStateBodyDto) {
        return this.creatureManagementService.runtimeChangeIndividualState({
            creatureInstanceId: id,
            ...body,
        });
    }

    @Post('runtime/individuals/:id/commands/change-affiliation')
    runtimeChangeAffiliation(@Param('id') id: string, @Body() body: RuntimeAffiliationBodyDto) {
        return this.creatureManagementService.runtimeChangeIndividualAffiliation({
            creatureInstanceId: id,
            cultureId: body.cultureId ?? null,
            ownerId: body.ownerId ?? null,
            factionId: body.factionId ?? null,
            expectedTimelineVersion: body.expectedTimelineVersion,
            reason: body.reason,
        });
    }

    @Post('runtime/individuals/:id/commands/retire')
    runtimeRetire(@Param('id') id: string, @Body() body: RuntimeRetireBodyDto) {
        return this.creatureManagementService.runtimeRetireIndividual({
            creatureInstanceId: id,
            ...body,
        });
    }
}
