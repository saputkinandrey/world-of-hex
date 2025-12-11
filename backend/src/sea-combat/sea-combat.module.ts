import { Module } from '@nestjs/common';
import { EncounterService } from './services/encounter.service';
import { EncounterRepository } from './repositories/encounter.repository';
import { MongooseModule } from '@nestjs/mongoose';
import { Player, PlayerSchema } from './schemas/player.schema';
import { Ship, ShipSchema } from './schemas/ship.schema';
import { PlayerController } from './controller/player.controller';
import { PlayerRepository } from './repositories/player.repository';
import { PlayersController } from './controller/players.controller';
import { PlayerService } from './services/player.service';
import { ShipRepository } from './repositories/ship.repository';
import { EncountersController } from './controller/encounters.controller';
import { ShipsController } from './controller/ships.controller';
import { Encounter, EncounterSchema } from './schemas/encounter.schema';
import { ShipController } from './controller/ship.controller';
import { SeaCombatGateway } from './services/sea-combat.gateway';

@Module({
    imports: [
        // import modules, etc.
        MongooseModule.forFeature([
            { name: Encounter.name, schema: EncounterSchema },
        ]),
        MongooseModule.forFeature([
            { name: Player.name, schema: PlayerSchema },
        ]),
        MongooseModule.forFeature([{ name: Ship.name, schema: ShipSchema }]),
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
        PlayerRepository,
        PlayerService,
        ShipRepository,
        SeaCombatGateway,
    ],
    exports: [EncounterService, PlayerService],
})
export class SeaCombatModule {}
