import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mockLimit = vi.fn()

vi.mock('@upstash/ratelimit', () => {
  const slidingWindow = () => ({})
  function Ratelimit() {
    return { limit: mockLimit }
  }
  Ratelimit.slidingWindow = slidingWindow
  return { Ratelimit, slidingWindow }
})

vi.mock('@upstash/redis', () => {
  function Redis() {
    return {}
  }
  return { Redis }
})

const ORIGINAL_ENV = process.env

function makeNextRequest(url: string, headers: Record<string, string> = {}) {
  return {
    nextUrl: { pathname: new URL(url).pathname },
    headers: { get: (k: string) => headers[k.toLowerCase()] ?? null },
  } as unknown as import('next/server').NextRequest
}

describe('rate-limit', () => {
  beforeEach(() => {
    vi.resetModules()
    mockLimit.mockReset()
    process.env = { ...ORIGINAL_ENV }
  })

  afterEach(() => {
    process.env = ORIGINAL_ENV
  })

  describe('rateLimitMiddleware', () => {
    it('permite todo si Upstash no esta configurado', async () => {
      delete process.env.UPSTASH_REDIS_REST_URL
      delete process.env.UPSTASH_REDIS_REST_TOKEN
      const { rateLimitMiddleware } = await import('@/lib/rate-limit')
      const req = makeNextRequest('http://localhost/api/test', { 'x-forwarded-for': '1.2.3.4' })
      const result = await rateLimitMiddleware(req, 10, '1 m')
      expect(result).toBeNull()
    })

    it('retorna 429 cuando se excede el limite', async () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://example.upstash.io'
      process.env.UPSTASH_REDIS_REST_TOKEN = 'fake-token'
      mockLimit.mockResolvedValueOnce({
        success: false,
        limit: 10,
        remaining: 0,
        reset: Date.now() + 30000,
      })

      const { rateLimitMiddleware } = await import('@/lib/rate-limit')
      const req = makeNextRequest('http://localhost/api/test', { 'x-forwarded-for': '1.2.3.4' })

      const result = await rateLimitMiddleware(req, 10, '1 m')
      expect(result).not.toBeNull()
      expect(result!.status).toBe(429)
      expect(result!.headers.get('Retry-After')).toBeTruthy()
      const body = await result!.json()
      expect(body.code).toBe('RATE_LIMITED')
    })

    it('retorna null cuando el request esta dentro del limite', async () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://example.upstash.io'
      process.env.UPSTASH_REDIS_REST_TOKEN = 'fake-token'
      mockLimit.mockResolvedValueOnce({
        success: true,
        limit: 10,
        remaining: 5,
        reset: Date.now() + 30000,
      })

      const { rateLimitMiddleware } = await import('@/lib/rate-limit')
      const req = makeNextRequest('http://localhost/api/test', { 'x-forwarded-for': '1.2.3.4' })

      const result = await rateLimitMiddleware(req, 10, '1 m')
      expect(result).toBeNull()
    })

    it('usa "anonymous" como identifier si no hay IP', async () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://example.upstash.io'
      process.env.UPSTASH_REDIS_REST_TOKEN = 'fake-token'
      mockLimit.mockResolvedValueOnce({
        success: true,
        remaining: 9,
        reset: Date.now() + 30000,
      })

      const { rateLimitMiddleware } = await import('@/lib/rate-limit')
      const req = makeNextRequest('http://localhost/api/test')

      await rateLimitMiddleware(req, 10, '1 m')
      expect(mockLimit).toHaveBeenCalled()
      const calledWith = mockLimit.mock.calls[0][0]
      expect(calledWith).toContain('anonymous')
    })
  })

  describe('rateLimitAction', () => {
    it('permite todo si Upstash no esta configurado', async () => {
      delete process.env.UPSTASH_REDIS_REST_URL
      delete process.env.UPSTASH_REDIS_REST_TOKEN
      const { rateLimitAction } = await import('@/lib/rate-limit')
      const result = await rateLimitAction('user-123', 'joinTeam', 5, '1 m')
      expect(result.success).toBe(true)
    })

    it('retorna success:false con code RATE_LIMITED cuando excede', async () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://example.upstash.io'
      process.env.UPSTASH_REDIS_REST_TOKEN = 'fake-token'
      mockLimit.mockResolvedValueOnce({
        success: false,
        remaining: 0,
        reset: Date.now() + 30000,
      })

      const { rateLimitAction } = await import('@/lib/rate-limit')
      const result = await rateLimitAction('user-123', 'joinTeam', 5, '1 m')
      expect(result.success).toBe(false)
      expect(result.code).toBe('RATE_LIMITED')
      expect(result.error).toBeTruthy()
    })

    it('retorna success:true cuando esta dentro del limite', async () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://example.upstash.io'
      process.env.UPSTASH_REDIS_REST_TOKEN = 'fake-token'
      mockLimit.mockResolvedValueOnce({
        success: true,
        remaining: 4,
        reset: Date.now() + 30000,
      })

      const { rateLimitAction } = await import('@/lib/rate-limit')
      const result = await rateLimitAction('user-123', 'joinTeam', 5, '1 m')
      expect(result.success).toBe(true)
    })
  })
})
