import { Ratelimit } from "@upstash/ratelimit";
import { redis, isRedisConfigured } from "./redis";
import { isRateLimited } from "./rateLimiter";

type RateLimitAction = "otp" | "login" | "api";

interface RateLimitResult {
    success: boolean;
    limit: number;
    remaining: number;
    reset: number;
}

let hasLoggedMemoryWarning = false;

function getRules(action: RateLimitAction): { maxAttempts: number; windowMs: number; windowString: `${number} s` | `${number} m` } {
    switch (action) {
        case "otp":
            return { maxAttempts: 5, windowMs: 10 * 60 * 1000, windowString: "10 m" };
        case "login":
            return { maxAttempts: 10, windowMs: 15 * 60 * 1000, windowString: "15 m" };
        case "api":
            return { maxAttempts: 60, windowMs: 60 * 1000, windowString: "1 m" };
    }
}

// Cache ratelimit instances so we don't recreate them every call
const ratelimiterCache = new Map<RateLimitAction, Ratelimit>();

export async function checkRateLimit(identifier: string, action: RateLimitAction): Promise<RateLimitResult> {
    const key = `ratelimit:${action}:${identifier}`;
    const rules = getRules(action);

    if (!isRedisConfigured()) {
        if (!hasLoggedMemoryWarning) {
            console.warn("Rate limiter running in memory-only mode. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN for production rate limiting.");
            hasLoggedMemoryWarning = true;
        }
        
        // Use original implementation for memory fallback
        const isLimited = isRateLimited(key, rules.maxAttempts, rules.windowMs / 1000);
        return { 
            success: !isLimited, 
            limit: rules.maxAttempts, 
            remaining: isLimited ? 0 : 1, // Fallback placeholder
            reset: 0 // Fallback placeholder
        };
    }

    let ratelimiter = ratelimiterCache.get(action);
    if (!ratelimiter) {
        ratelimiter = new Ratelimit({
            redis,
            limiter: Ratelimit.slidingWindow(rules.maxAttempts, rules.windowString),
            analytics: true,
        });
        ratelimiterCache.set(action, ratelimiter);
    }

    const { success, limit, remaining, reset } = await ratelimiter.limit(key);
    return { success, limit, remaining, reset };
}
