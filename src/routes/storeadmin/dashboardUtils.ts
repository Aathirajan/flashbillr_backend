
// Utility functions and constants for dashboard endpoints
import Redis, { Redis as RedisType } from 'ioredis';

let redis: RedisType | null = null;
try {
  if (process.env.REDIS_URL) {
    redis = new Redis(process.env.REDIS_URL);
  } else {
    redis = new Redis(); // fallback to default localhost:6379
  }
} catch (err) {
  redis = null;
  console.warn('[dashboardUtils] Redis unavailable, running uncached.');
}

export const CACHE_TTL = {
  MONTHLY_DATA: 24 * 60 * 60, // 24 hours
  DAILY_SUMMARY: 5 * 60, // 5 minutes
  CUSTOMER_LOCATIONS: 60 * 60, // 1 hour
  TOP_PRODUCTS: 30 * 60, // 30 minutes
  LOW_STOCK: 10 * 60, // 10 minutes
};

export const safeRedisGet = async (key: string) => {
  if (!redis) return null;
  try {
    return await redis.get(key);
  } catch (e) {
    console.warn(`[dashboard] Redis get failed for key ${key}`);
    return null;
  }
};
export const safeRedisSetex = async (key: string, ttl: number, value: string) => {
  if (!redis) return;
  try {
    await redis.setex(key, ttl, value);
  } catch (e) {
    console.warn(`[dashboard] Redis setex failed for key ${key}`);
  }
};

export { redis };
