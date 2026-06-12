import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { NextRequest, NextResponse } from 'next/server'

let redis: Redis | null = null

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim()
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim()
  if (!url || !token) return null
  if (!redis) {
    redis = new Redis({ url, token })
  }
  return redis
}

function createLimiter(
  limit: number,
  window: `${number} ${'s' | 'm' | 'h' | 'd'}`,
  prefix: string,
): Ratelimit | null {
  const r = getRedis()
  if (!r) return null
  return new Ratelimit({
    redis: r,
    limiter: Ratelimit.slidingWindow(limit, window),
    ephemeralCache: new Map(),
    prefix,
  })
}

export async function rateLimitMiddleware(
  request: NextRequest,
  limit: number,
  window: `${number} ${'s' | 'm' | 'h' | 'd'}` = '1 m',
): Promise<NextResponse | null> {
  const path = request.nextUrl.pathname
  const limiter = createLimiter(limit, window, `rl:${path}`)
  if (!limiter) return null

  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'anonymous'
  const identifier = `${ip}:${path}`

  const { success, reset } = await limiter.limit(identifier)

  if (!success) {
    const retryAfter = Math.ceil((reset - Date.now()) / 1000)
    return new NextResponse(
      JSON.stringify({
        error: 'Demasiadas solicitudes. Intenta de nuevo mas tarde.',
        code: 'RATE_LIMITED',
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(retryAfter),
          'X-RateLimit-Limit': String(limit),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(reset),
        },
      },
    )
  }

  return null
}

export async function rateLimitAction(
  userId: string,
  actionName: string,
  limit: number,
  window: `${number} ${'s' | 'm' | 'h' | 'd'}` = '1 m',
): Promise<{ success: boolean; error?: string; code?: string }> {
  const limiter = createLimiter(limit, window, `rl:action:${actionName}`)
  if (!limiter) return { success: true }

  const { success } = await limiter.limit(userId)
  if (!success) {
    return {
      success: false,
      error: 'Demasiadas operaciones. Espera un momento.',
      code: 'RATE_LIMITED',
    }
  }
  return { success: true }
}
