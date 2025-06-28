import { Module, Global } from '@nestjs/common';
import { CacheModule, CacheStore } from '@nestjs/cache-manager';
import { RedisService } from './redis.service';
import { redisStore } from 'cache-manager-redis-store';
import { HttpModule } from '@nestjs/axios';
import { environment } from 'src/shared/environment';

@Global()
@Module({
  imports: [
    HttpModule,
    CacheModule.registerAsync({
      useFactory: async () => {
        const host = environment.REDIS_HOST || 'localhost';
        const port: number = Number(environment.REDIS_PORT || 6379);
        console.log('REDIS STORE CONFIG', {
          socket: {
            host,
            port,
            tls: environment.NODE_ENV === 'production',
          },
        });
        const store = await redisStore({
          socket: {
            host,
            port,
            tls: environment.NODE_ENV === 'production',
          },
        });

        // Had to cast the type of the store, since they've changed the api for CacheStore and RedisStore does not implement it
        return {
          store: store as unknown as CacheStore,
        };
      },
    }),
  ],
  providers: [RedisService],
  exports: [RedisService, CacheModule],
})
export class RedisModule {}
