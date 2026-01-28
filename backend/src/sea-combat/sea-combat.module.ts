import { Module } from '@nestjs/common';
import { EncounterService } from './services/encounter.service';
import { EncounterRepository } from './repositories/encounter.repository';
import { MongooseModule } from '@nestjs/mongoose';
import { Ship, ShipSchema } from './schemas/ship.schema';
import { PlayerController } from './controller/player.controller';
import { PlayersController } from './controller/players.controller';
import { ShipRepository } from './repositories/ship.repository';
import { EncountersController } from './controller/encounters.controller';
import { ShipsController } from './controller/ships.controller';
import { Encounter, EncounterSchema } from './schemas/encounter.schema';
import { ShipController } from './controller/ship.controller';
import { SeaCombatSocketIoGateway } from './services/sea-combat-socketio.gateway';
import { PlayerModule } from '../player/player.module';

@Module({
    imports: [
        // import modules, etc.
        MongooseModule.forFeature([
            { name: Encounter.name, schema: EncounterSchema },
        ]),
        MongooseModule.forFeature([{ name: Ship.name, schema: ShipSchema }]),
        PlayerModule,
    ],
    controllers: [
        PlayerController,
        PlayersController,
        EncountersController,
        ShipsController,
        ShipController,
    ],
    providers: [
        EncounterService,
        EncounterRepository,
        ShipRepository,
        SeaCombatSocketIoGateway,
    ],
    exports: [EncounterService],
})
export class SeaCombatModule {}
