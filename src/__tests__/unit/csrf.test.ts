import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockCookieStore } = vi.hoisted(() => ({
  mockCookieStore: {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue(mockCookieStore),
}))

import { getOrIssueCsrfToken, assertCsrfToken, assertCsrfFromRequest } from '@/lib/csrf'
import { NextRequest } from 'next/server'

function makeRequest(opts: {
  origin?: string | null
  referer?: string | null
  headerToken?: string | null
  cookieToken?: string | null
  method?: string
}): NextRequest {
  const headers: Record<string, string> = {}
  if (opts.origin) headers['origin'] = opts.origin
  if (opts.referer) headers['referer'] = opts.referer
  if (opts.headerToken) headers['x-csrf-token'] = opts.headerToken
  const url = 'http://localhost:3000/api/test'
  const req = new NextRequest(new Request(url, { method: opts.method ?? 'POST', headers }))
  if (opts.cookieToken) {
    req.cookies.set('__Host-csrf-token', opts.cookieToken)
  }
  return req
}

describe('csrf tokens', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getOrIssueCsrfToken', () => {
    it('returns existing token when cookie is set', async () => {
      mockCookieStore.get.mockReturnValue({ value: 'existing-token' })
      const token = await getOrIssueCsrfToken()
      expect(token).toBe('existing-token')
      expect(mockCookieStore.set).not.toHaveBeenCalled()
    })

    it('issues a new token and sets cookie when none exists', async () => {
      mockCookieStore.get.mockReturnValue(undefined)
      const token = await getOrIssueCsrfToken()
      expect(token).toBeTruthy()
      expect(token.length).toBeGreaterThan(20)
      expect(mockCookieStore.set).toHaveBeenCalledWith(
        '__Host-csrf-token',
        token,
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'lax',
          path: '/',
        }),
      )
    })
  })

  describe('assertCsrfToken', () => {
    it('throws when token is missing', async () => {
      await expect(assertCsrfToken(null)).rejects.toThrow(/missing/)
      await expect(assertCsrfToken(undefined)).rejects.toThrow(/missing/)
      await expect(assertCsrfToken('')).rejects.toThrow(/missing/)
    })

    it('throws when cookie is missing', async () => {
      mockCookieStore.get.mockReturnValue(undefined)
      await expect(assertCsrfToken('abc')).rejects.toThrow(/cookie missing/)
    })

    it('throws when token does not match cookie', async () => {
      mockCookieStore.get.mockReturnValue({ value: 'cookie-token' })
      await expect(assertCsrfToken('different')).rejects.toThrow(/mismatch/)
    })

    it('passes when token matches cookie (same length)', async () => {
      mockCookieStore.get.mockReturnValue({ value: 'matching-token-aaaaa' })
      await expect(assertCsrfToken('matching-token-aaaaa')).resolves.toBeUndefined()
    })
  })

  describe('assertCsrfFromRequest', () => {
    it('returns 403 when header token is missing', () => {
      const req = makeRequest({ cookieToken: 'some-token' })
      const res = assertCsrfFromRequest(req)
      expect(res).not.toBeNull()
      expect(res?.status).toBe(403)
    })

    it('returns 403 when cookie is missing', () => {
      const req = makeRequest({ headerToken: 'some-token' })
      const res = assertCsrfFromRequest(req)
      expect(res).not.toBeNull()
      expect(res?.status).toBe(403)
    })

    it('returns 403 when tokens differ', () => {
      const req = makeRequest({ headerToken: 'header', cookieToken: 'cookie' })
      const res = assertCsrfFromRequest(req)
      expect(res).not.toBeNull()
      expect(res?.status).toBe(403)
    })

    it('returns null when tokens match', () => {
      const req = makeRequest({ headerToken: 'matching-token', cookieToken: 'matching-token' })
      const res = assertCsrfFromRequest(req)
      expect(res).toBeNull()
    })
  })
})
