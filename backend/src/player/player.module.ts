import { Module } from '@nestjs/common';

import { MongooseModule } from '@nestjs/mongoose';
import { Player, PlayerSchema } from './schemas/player.schema';

@Module({
  imports: [
    // import modules, etc.
    MongooseModule.forFeature([{ name: Player.name, schema: PlayerSchema }]),
  ],
  controllers: [],
  providers: [],
  exports: [],
})
export class PlayerModule {}
