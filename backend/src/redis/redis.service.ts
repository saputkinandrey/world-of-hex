import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { Cache } from 'cache-manager';

@Injectable()
export class RedisService {
  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

  async get<T>(key: string): Promise<T | undefined> {
    return this.cacheManager.get<T>(key);
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    await this.cacheManager.set(key, value, { ttl } as any);
  }

  async del(key: string): Promise<void> {
    await this.cacheManager.del(key);
  }

  async cleanPath(path: string): Promise<void> {
    const client = await (this.cacheManager.store as any).getClient();

    const keys = await client.keys(`${path}:*`);
    if (keys.length > 0) {
      await client.del(keys);
    }
  }
}
