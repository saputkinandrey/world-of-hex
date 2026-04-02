import { Module } from '@nestjs/common';
import { EncounterService } from './services/encounter.service';
import { EncounterRepository } from './repositories/encounter.repository';
import { MongooseModule } from '@nestjs/mongoose';
import { Ship, ShipSchema } from './schemas/ship.schema';
import { PlayersController } from './controller/players.controller';
import { ShipRepository } from './repositories/ship.repository';
import { EncountersController } from './controller/encounters.controller';
import { ShipsController } from './controller/ships.controller';
import { Encounter, EncounterSchema } from './schemas/encounter.schema';
import { ShipController } from './controller/ship.controller';
import { SeaCombatGateway } from './services/sea-combat.gateway';
import { PlayerModule } from '../player/player.module';
import { PendingIntent, PendingIntentSchema } from './schemas/pending-intent.schema';
import { PendingIntentRepository } from './repositories/pending-intent.repository';
import { TurnEntropy, TurnEntropySchema } from './schemas/turn-entropy.schema';
import { TurnEntropyRepository } from './repositories/turn-entropy.repository';
import { TurnAdvanceRequest, TurnAdvanceRequestSchema } from './schemas/turn-advance-request.schema';
import { TurnAdvanceRequestRepository } from './repositories/turn-advance-request.repository';
import { EncounterEventReadRepository } from './repositories/encounter-event-read.repository';
import { EncounterTurnAdvanceListener } from './services/encounter-turn-advance.listener';

@Module({
    imports: [
        // import modules, etc.
        MongooseModule.forFeature([{ name: Encounter.name, schema: EncounterSchema }]),
        MongooseModule.forFeature([{ name: Ship.name, schema: ShipSchema }]),
        MongooseModule.forFeature([{ name: PendingIntent.name, schema: PendingIntentSchema }]),
        MongooseModule.forFeature([{ name: TurnEntropy.name, schema: TurnEntropySchema }]),
        MongooseModule.forFeature([{ name: TurnAdvanceRequest.name, schema: TurnAdvanceRequestSchema }]),
        PlayerModule,
    ],
    controllers: [PlayersController, EncountersController, ShipsController, ShipController],
    providers: [
        EncounterService,
        EncounterRepository,
        EncounterEventReadRepository,
        PendingIntentRepository,
        TurnEntropyRepository,
        TurnAdvanceRequestRepository,
        ShipRepository,
        SeaCombatGateway,
        EncounterTurnAdvanceListener,
    ],
    exports: [EncounterService],
})
export class SeaCombatModule {}
