import { Module } from '@nestjs/common';
import { OllamaService } from './ollama.service';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    HttpModule, // нужен @nestjs/axios
    ConfigModule.forRoot({ isGlobal: true }),
  ],
  controllers: [],
  providers: [OllamaService],
  exports: [OllamaService],
})
export class AiModule {}
