import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/db-internal', () => ({
  checkUpcomingExpirations: vi.fn().mockResolvedValue({ total: 0 }),
  checkUpcomingPaymentDues: vi.fn().mockResolvedValue({
    preDue7: 0,
    preDue3: 0,
    dueToday: 0,
    overdue1: 0,
    overdue7: 0,
  }),
  createNotificationInternal: vi.fn(),
  logActivityInternal: vi.fn(),
}))

vi.mock('@/lib/backup', () => ({
  createBackup: vi.fn().mockResolvedValue({
    success: true,
    nombreArchivo: 'backup-test.json.gz',
    totalFilas: 0,
    tablas: {},
    tamanoBytes: 0,
    duracionMs: 0,
  }),
  cleanOldBackups: vi.fn().mockResolvedValue({ eliminados: 0 }),
}))

const ORIGINAL_ENV = process.env

function makeRequest(authHeader?: string) {
  const headers: Record<string, string> = {}
  if (authHeader !== undefined) headers.authorization = authHeader
  return new Request('http://localhost/api/cron', { headers })
}

describe('GET /api/cron — Auth', () => {
  beforeEach(() => {
    vi.resetModules()
    process.env = { ...ORIGINAL_ENV }
  })

  afterEach(() => {
    process.env = ORIGINAL_ENV
  })

  it('returns 401 when CRON_SECRET is not configured (fail-closed)', async () => {
    delete process.env.CRON_SECRET

    const { GET } = await import('@/app/api/cron/route')
    const response = await GET(makeRequest('Bearer anything'))

    expect(response.status).toBe(401)
    const body = await response.json()
    expect(body.error).toBe('CRON_SECRET is not configured')
  })

  it('returns 401 when authorization header is missing', async () => {
    process.env.CRON_SECRET = 'real-secret-123'

    const { GET } = await import('@/app/api/cron/route')
    const response = await GET(makeRequest())

    expect(response.status).toBe(401)
  })

  it('returns 401 when authorization header has wrong secret', async () => {
    process.env.CRON_SECRET = 'real-secret-123'

    const { GET } = await import('@/app/api/cron/route')
    const response = await GET(makeRequest('Bearer wrong-secret'))

    expect(response.status).toBe(401)
  })

  it('returns 401 when an attacker sends "Bearer undefined" (regression of the bypass bug)', async () => {
    delete process.env.CRON_SECRET

    const { GET } = await import('@/app/api/cron/route')
    const response = await GET(makeRequest('Bearer undefined'))

    expect(response.status).toBe(401)
  })

  it('returns 200 when authorization header matches CRON_SECRET', async () => {
    process.env.CRON_SECRET = 'real-secret-123'

    const { GET } = await import('@/app/api/cron/route')
    const response = await GET(makeRequest('Bearer real-secret-123'))

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.success).toBe(true)
  })
})
