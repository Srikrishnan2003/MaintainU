// NOTE: In production Serverless environments (like Vercel), in-memory Maps reset per instance.
// Switch to @upstash/redis or a database table strategy when scaling.

const rateLimitMap = new Map<string, { count: number; windowStart: number }>();

export function isRateLimited(identifier: string, maxAttempts: number = 3, windowSeconds: number = 60): boolean {
    const now = Date.now();
    const WINDOW_MS = windowSeconds * 1000;

    const record = rateLimitMap.get(identifier);

    if (!record) {
        rateLimitMap.set(identifier, { count: 1, windowStart: now });
        return false;
    }

    // Reset window if completely passed
    if (now - record.windowStart > WINDOW_MS) {
        rateLimitMap.set(identifier, { count: 1, windowStart: now });
        return false;
    }

    if (record.count >= maxAttempts) {
        return true; // Strongly Rate Limited
    }

    record.count += 1;
    rateLimitMap.set(identifier, record);
    return false;
}
