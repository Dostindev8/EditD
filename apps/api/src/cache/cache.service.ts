import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import Redis from "ioredis";

@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly log = new Logger(CacheService.name);
  private redis: Redis | null = null;
  private readonly mem = new Map<string, { v: string; exp: number }>();

  constructor() {
    const url = process.env.REDIS_URL;
    if (url) {
      this.redis = new Redis(url, { maxRetriesPerRequest: 1, enableOfflineQueue: false });
      this.redis.on("error", (err) => {
        this.log.warn(`Redis unavailable, using Map() fallback: ${err.message}`);
      });
    }
  }

  async get(key: string): Promise<string | null> {
    try {
      if (this.redis) {
        const v = await this.redis.get(key);
        if (v) return v;
      }
    } catch {
      /* fallback */
    }
    const hit = this.mem.get(key);
    if (!hit) return null;
    if (Date.now() > hit.exp) {
      this.mem.delete(key);
      return null;
    }
    return hit.v;
  }

  async set(key: string, value: string, ttlSec: number): Promise<void> {
    this.mem.set(key, { v: value, exp: Date.now() + ttlSec * 1000 });
    try {
      if (this.redis) await this.redis.set(key, value, "EX", ttlSec);
    } catch {
      /* mem already set */
    }
  }

  async del(key: string): Promise<void> {
    this.mem.delete(key);
    try {
      if (this.redis) await this.redis.del(key);
    } catch {
      /* ignore */
    }
  }

  async onModuleDestroy() {
    if (this.redis) await this.redis.quit();
  }
}
