// ─────────────────────────────────────────────────────────────────────────────
// Rate Limiting
//
// Uses Upstash Redis in production (set UPSTASH_REDIS_REST_URL and
// UPSTASH_REDIS_REST_TOKEN in .env.local).
//
// Falls back to a simple in-memory store for local development.
// In-memory store resets on every server restart — fine for dev, not for prod.
// ─────────────────────────────────────────────────────────────────────────────

type RateLimitResult = {
  success: boolean
  remaining: number
  reset: number     // Unix timestamp when the window resets
}

// In-memory fallback for local development
const memoryStore = new Map<string, { count: number; resetAt: number }>()

function checkMemoryRateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now()
  const record = memoryStore.get(key)

  if (!record || now > record.resetAt) {
    // First request or window expired
    memoryStore.set(key, { count: 1, resetAt: now + windowMs })
    return { success: true, remaining: limit - 1, reset: now + windowMs }
  }

  if (record.count >= limit) {
    return { success: false, remaining: 0, reset: record.resetAt }
  }

  record.count++
  return {
    success: true,
    remaining: limit - record.count,
    reset: record.resetAt,
  }
}

// Rate limit configurations per route
export const RATE_LIMITS = {
  analyze: { limit: 10, windowMs: 60 * 60 * 1000 },  // 10/hour — expensive route
  chat:    { limit: 60, windowMs: 60 * 60 * 1000 },  // 60/hour — lighter route
  library: { limit: 30, windowMs: 60 * 60 * 1000 },  // 30/hour
} as const

export type RateLimitRoute = keyof typeof RATE_LIMITS

/**
 * Extract a per-client identifier from the request. Uses x-forwarded-for
 * (set by Vercel and most proxies), falls back to x-real-ip, then "unknown".
 * The first IP in x-forwarded-for is the original client.
 */
export function getClientIdentifier(request: Request): string {
  const fwd = request.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  const real = request.headers.get('x-real-ip')
  if (real) return real.trim()
  return 'unknown'
}

export async function checkRateLimit(
  route: RateLimitRoute,
  identifier = 'unknown'
): Promise<RateLimitResult> {
  const config = RATE_LIMITS[route]
  const key = `fundlens:${route}:${identifier}`

  // Use Upstash if configured
  if (
    process.env.UPSTASH_REDIS_REST_URL &&
    process.env.UPSTASH_REDIS_REST_TOKEN
  ) {
    try {
      const { Ratelimit } = await import('@upstash/ratelimit')
      const { Redis }     = await import('@upstash/redis')

      const redis = new Redis({
        url:   process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })

      const ratelimit = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(config.limit, `${config.windowMs}ms`),
        analytics: false,
      })

      const result = await ratelimit.limit(key)
      return {
        success:   result.success,
        remaining: result.remaining,
        reset:     result.reset,
      }
    } catch (err) {
      // If Upstash fails, fall back to memory store rather than blocking requests
      console.warn('Upstash rate limit error, falling back to memory:', err)
    }
  }

  // In-memory fallback
  return checkMemoryRateLimit(key, config.limit, config.windowMs)
}

/**
 * Build rate limit response headers
 */
export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset':     String(result.reset),
  }
}
