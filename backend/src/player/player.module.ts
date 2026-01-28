import { Module } from '@nestjs/common';

import { MongooseModule } from '@nestjs/mongoose';
import { Player, PlayerSchema } from './schemas/player.schema';
import { PlayerRepository } from './repositories/player.repository';
import { PlayerService } from './services/player.service';

@Module({
    imports: [
        // import modules, etc.
        MongooseModule.forFeature([
            { name: Player.name, schema: PlayerSchema },
        ]),
    ],
    controllers: [],
    providers: [PlayerRepository, PlayerService],
    exports: [PlayerRepository, PlayerService, MongooseModule],
})
export class PlayerModule {}
