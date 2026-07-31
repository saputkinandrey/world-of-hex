import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsObject, IsOptional, IsString, Min } from 'class-validator';
import { CohortState } from '../../world-population/domain/cohort.types';
import { CreatureInstanceState } from '../types/creature-management.types';

export class CreateIndividualBodyDto {
    @ApiProperty()
    @IsString()
    profileId: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    name?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    cultureId?: string | null;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    ownerId?: string | null;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    factionId?: string | null;

    @ApiPropertyOptional()
    @IsOptional()
    @IsObject()
    state?: CreatureInstanceState;

    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    writeTimeline?: boolean;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    reason?: string;
}

export class UpdateIndividualBodyDto {
    @ApiProperty()
    @IsInt()
    @Min(1)
    expectedProjectionVersion: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    name?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    cultureId?: string | null;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    ownerId?: string | null;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    factionId?: string | null;

    @ApiPropertyOptional()
    @IsOptional()
    @IsObject()
    state?: CreatureInstanceState;

    @ApiPropertyOptional({ enum: ['active', 'retired'] })
    @IsOptional()
    @IsIn(['active', 'retired'])
    status?: 'active' | 'retired';
}

export class DeleteIndividualQueryDto {
    @ApiProperty()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    expectedProjectionVersion: number;

    @ApiPropertyOptional()
    @IsOptional()
    @Type(() => Boolean)
    @IsBoolean()
    hardDelete?: boolean;
}

export class RecalculateIndividualStateBodyDto {
    @ApiProperty()
    @IsInt()
    @Min(1)
    expectedProjectionVersion: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    cultureId?: string | null;
}

class CohortCountQuantityDto {
    @ApiProperty({ enum: ['count'] })
    @IsIn(['count'])
    kind: 'count';

    @ApiProperty()
    @IsInt()
    @Min(0)
    count: number;
}

class CohortBiomassQuantityDto {
    @ApiProperty({ enum: ['biomass'] })
    @IsIn(['biomass'])
    kind: 'biomass';

    @ApiProperty()
    @IsInt()
    @Min(0)
    biomassLb: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsInt()
    @Min(0)
    coverageArea?: number;
}

export class CreateCohortBodyDto {
    @ApiProperty()
    @IsString()
    profileId: string;

    @ApiProperty()
    @IsString()
    cohortKind: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    name?: string;

    @ApiProperty()
    @IsObject()
    quantity: CohortCountQuantityDto | CohortBiomassQuantityDto;

    @ApiPropertyOptional()
    @IsOptional()
    @IsObject()
    state?: CohortState;

    @ApiPropertyOptional({ type: [String] })
    @IsOptional()
    stateScope?: string[];

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    cultureId?: string | null;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    ownerId?: string | null;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    factionId?: string | null;

    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    writeTimeline?: boolean;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    reason?: string;
}

export class UpdateCohortBodyDto {
    @ApiProperty()
    @IsInt()
    @Min(1)
    expectedVersion: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    name?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsObject()
    quantity?: CohortCountQuantityDto | CohortBiomassQuantityDto;

    @ApiPropertyOptional()
    @IsOptional()
    @IsObject()
    state?: CohortState;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    cultureId?: string | null;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    ownerId?: string | null;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    factionId?: string | null;

    @ApiPropertyOptional({ enum: ['active', 'retired'] })
    @IsOptional()
    @IsIn(['active', 'retired'])
    status?: 'active' | 'retired';
}

export class DeleteCohortQueryDto {
    @ApiProperty()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    expectedVersion: number;

    @ApiPropertyOptional()
    @IsOptional()
    @Type(() => Boolean)
    @IsBoolean()
    hardDelete?: boolean;
}

export class RecalculateCohortStateBodyDto {
    @ApiProperty()
    @IsInt()
    @Min(1)
    expectedVersion: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    cultureId?: string | null;
}

export class AdminTimelineEventBodyDto {
    @ApiProperty()
    @IsString()
    reason: string;

    @ApiProperty({ enum: ['rename', 'state', 'affiliation', 'retire'] })
    @IsIn(['rename', 'state', 'affiliation', 'retire'])
    eventType: 'rename' | 'state' | 'affiliation' | 'retire';

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    name?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsObject()
    state?: CreatureInstanceState;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    cultureId?: string | null;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    ownerId?: string | null;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    factionId?: string | null;
}

export class RevertTimelineEventBodyDto {
    @ApiProperty()
    @IsString()
    reason: string;
}

export class RuntimeRenameBodyDto {
    @ApiProperty()
    @IsInt()
    @Min(0)
    expectedTimelineVersion: number;

    @ApiProperty()
    @IsString()
    name: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    reason?: string;
}

export class RuntimeStateBodyDto {
    @ApiProperty()
    @IsInt()
    @Min(0)
    expectedTimelineVersion: number;

    @ApiProperty()
    @IsObject()
    state: CreatureInstanceState;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    reason?: string;
}

export class RuntimeAffiliationBodyDto {
    @ApiProperty()
    @IsInt()
    @Min(0)
    expectedTimelineVersion: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    cultureId?: string | null;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    ownerId?: string | null;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    factionId?: string | null;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    reason?: string;
}

export class RuntimeRetireBodyDto {
    @ApiProperty()
    @IsInt()
    @Min(0)
    expectedTimelineVersion: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    reason?: string;
}
