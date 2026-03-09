import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { checkRateLimit as checkInMemory } from "./rate-limit";

/**
 * Production-grade rate limiting using Upstash Redis (Vercel KV)
 *
 * In production (Vercel), this uses Redis for distributed rate limiting.
 * In development, falls back to in-memory rate limiting.
 *
 * Environment variables (auto-set by Vercel when you add Upstash Redis):
 * - KV_REST_API_URL or UPSTASH_REDIS_REST_URL
 * - KV_REST_API_TOKEN or UPSTASH_REDIS_REST_TOKEN
 */

let redis: Redis | null = null;
let rateLimiters: Map<string, Ratelimit> = new Map();

/**
 * Check if Redis is configured
 */
function isRedisConfigured(): boolean {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

  return !!(url && token);
}

/**
 * Get or create Redis client
 */
export function getRedisClient(): Redis | null {
  if (!isRedisConfigured()) {
    return null;
  }

  if (!redis) {
    const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

    redis = new Redis({
      url: url!,
      token: token!
    });
  }

  return redis;
}

/**
 * Get or create rate limiter for a specific limit config
 */
function getRateLimiter(limit: number, windowMs: number): Ratelimit | null {
  const redisClient = getRedisClient();
  if (!redisClient) {
    return null;
  }

  const key = `${limit}:${windowMs}`;
  if (rateLimiters.has(key)) {
    return rateLimiters.get(key)!;
  }

  // Convert milliseconds to seconds for Upstash
  const windowSeconds = Math.floor(windowMs / 1000);

  const limiter = new Ratelimit({
    redis: redisClient,
    limiter: Ratelimit.slidingWindow(limit, `${windowSeconds} s`),
    analytics: true, // Enable analytics in Upstash dashboard
    prefix: "ratelimit" // Namespace for Redis keys
  });

  rateLimiters.set(key, limiter);
  return limiter;
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Check rate limit using Redis (production) or in-memory (development)
 *
 * @param key - Unique identifier for the rate limit bucket (e.g., `login:user@example.com`)
 * @param limit - Maximum number of requests allowed in the window
 * @param windowMs - Time window in milliseconds
 * @returns Rate limit result
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number = 60_000
): Promise<RateLimitResult> {
  const limiter = getRateLimiter(limit, windowMs);

  // Fallback to in-memory if Redis not configured
  if (!limiter) {
    if (process.env.NODE_ENV === "production") {
      console.warn(
        "[RateLimit] Redis not configured in production - using in-memory rate limiting. " +
        "This will not work correctly with multiple serverless instances. " +
        "Add Upstash Redis integration in Vercel dashboard."
      );
    }

    // Use synchronous in-memory limiter
    return checkInMemory(key, limit, windowMs);
  }

  try {
    const result = await limiter.limit(key);

    return {
      success: result.success,
      remaining: result.remaining,
      resetAt: result.reset
    };
  } catch (error) {
    console.error("[RateLimit] Redis error, falling back to in-memory:", error);

    // Graceful fallback to in-memory if Redis fails
    return checkInMemory(key, limit, windowMs);
  }
}

/**
 * Rate limiters for common operations
 */

/**
 * Login rate limiter: 10 attempts per 15 minutes per email
 */
export async function checkLoginRateLimit(email: string): Promise<RateLimitResult> {
  return checkRateLimit(`login:${email.toLowerCase()}`, 10, 15 * 60 * 1000);
}

/**
 * Upload rate limiter: 20 uploads per 10 minutes per user
 */
export async function checkUploadRateLimit(userId: string): Promise<RateLimitResult> {
  return checkRateLimit(`upload:${userId}`, 20, 10 * 60 * 1000);
}

/**
 * API rate limiter: 100 requests per minute per IP
 */
export async function checkApiRateLimit(ip: string): Promise<RateLimitResult> {
  return checkRateLimit(`api:${ip}`, 100, 60 * 1000);
}

/**
 * Signup rate limiter: 5 signups per hour per IP
 */
export async function checkSignupRateLimit(ip: string): Promise<RateLimitResult> {
  return checkRateLimit(`signup:${ip}`, 5, 60 * 60 * 1000);
}

/**
 * Password reset rate limiter: 3 requests per hour per email
 */
export async function checkPasswordResetRateLimit(email: string): Promise<RateLimitResult> {
  return checkRateLimit(`password-reset:${email.toLowerCase()}`, 3, 60 * 60 * 1000);
}

/**
 * Check if Redis rate limiting is available
 */
export function isRateLimitingConfigured(): boolean {
  return isRedisConfigured();
}

// ---------------------------------------------------------------------------
// Account Lockout (persistent, Redis-backed)
// ---------------------------------------------------------------------------

const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_TTL_SECONDS = 30 * 60; // 30 minutes

// In-memory fallback for development (single-instance only)
const inMemoryLockout = new Map<string, { attempts: number; expiresAt: number }>();

/**
 * Check whether an account is currently locked out.
 * Returns { locked: true } if the failure threshold has been reached.
 */
export async function checkAccountLockout(
  email: string
): Promise<{ locked: boolean; attempts: number }> {
  const key = `lockout:${email.toLowerCase()}`;
  const redisClient = getRedisClient();

  if (redisClient) {
    const attempts = (await redisClient.get<number>(key)) ?? 0;
    return { locked: attempts >= LOCKOUT_THRESHOLD, attempts };
  }

  // In-memory fallback
  const entry = inMemoryLockout.get(key);
  if (!entry || Date.now() > entry.expiresAt) {
    inMemoryLockout.delete(key);
    return { locked: false, attempts: 0 };
  }
  return { locked: entry.attempts >= LOCKOUT_THRESHOLD, attempts: entry.attempts };
}

/**
 * Record one failed login attempt. Starts a 30-minute lockout window.
 * Returns the total failure count so callers can trigger audit logs.
 */
export async function recordFailedLoginAttempt(email: string): Promise<number> {
  const key = `lockout:${email.toLowerCase()}`;
  const redisClient = getRedisClient();

  if (redisClient) {
    const attempts = await redisClient.incr(key);
    if (attempts === 1) {
      await redisClient.expire(key, LOCKOUT_TTL_SECONDS);
    }
    return attempts;
  }

  // In-memory fallback
  const now = Date.now();
  const entry = inMemoryLockout.get(key);
  if (!entry || now > entry.expiresAt) {
    inMemoryLockout.set(key, { attempts: 1, expiresAt: now + LOCKOUT_TTL_SECONDS * 1000 });
    return 1;
  }
  entry.attempts += 1;
  return entry.attempts;
}

/**
 * Clear the lockout counter on successful login.
 */
export async function clearAccountLockout(email: string): Promise<void> {
  const key = `lockout:${email.toLowerCase()}`;
  const redisClient = getRedisClient();

  if (redisClient) {
    await redisClient.del(key);
    return;
  }

  inMemoryLockout.delete(key);
}
