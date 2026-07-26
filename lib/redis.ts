import { Redis } from "@upstash/redis";

export function isRedisConfigured(): boolean {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    return typeof url === "string" && url.trim().length > 0 &&
           typeof token === "string" && token.trim().length > 0;
}

// Ensure we don't crash at module initialization if variables are missing.
// The rate limiter will fallback if isRedisConfigured() is false.
export const redis = isRedisConfigured()
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
    : null as unknown as Redis;
