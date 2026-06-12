/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFrom = vi.fn()
const mockEq = vi.fn()
const mockMaybeSingle = vi.fn()
const mockUpsert = vi.fn()

vi.mock('@/lib/supabase/authenticated', () => ({
  createAuthenticatedClient: () => ({ from: mockFrom }),
}))

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: () => ({ from: mockFrom }),
}))

vi.mock('@/lib/auth', () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}))

vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}))

/**
 * Setup for getPricingConfig tests.
 * Only call: supabase.from('site_settings').select('key, value') -> resolves
 * with siteSettingsRows.
 */
function setupForGetPricingConfig(rows: Array<{ key: string; value: unknown }> | null) {
  const chain: Record<string, any> = {}
  chain.select = vi.fn(() => Promise.resolve({ data: rows, error: null }))
  chain.eq = vi.fn(() => chain)
  chain.maybeSingle = vi.fn(() => Promise.resolve({ data: null, error: null }))
  chain.upsert = vi.fn(() => Promise.resolve({ data: null, error: null }))
  mockFrom.mockReturnValue(chain)
  return chain
}

/**
 * Setup for updatePricingConfig tests.
 *  1st .from() call: admin role check. chain.eq().maybeSingle() -> adminRole
 *  2nd .from() call: upsert -> returns upsertError or null
 *  3rd .from() call: post-update getPricingConfig() -> resolves with rows
 */
function setupForUpdatePricingConfig(opts: {
  adminRole?: 'admin' | 'atleta' | null
  upsertError?: { message: string } | null
  finalRows?: Array<{ key: string; value: unknown }> | null
}) {
  let fromCallCount = 0
  const chain: Record<string, any> = {}

  // 1st call: admin role check chain
  const adminChain: Record<string, any> = {}
  adminChain.select = vi.fn(() => adminChain)
  adminChain.eq = vi.fn(() => adminChain)
  adminChain.maybeSingle = vi.fn(() => Promise.resolve({
    data: opts.adminRole === null || opts.adminRole === undefined ? null : { role: opts.adminRole },
    error: null,
  }))

  // Shared chain for subsequent calls
  chain.select = vi.fn(() => Promise.resolve({ data: opts.finalRows ?? null, error: null }))
  chain.eq = vi.fn(() => chain)
  chain.maybeSingle = vi.fn(() => Promise.resolve({ data: null, error: null }))
  chain.upsert = vi.fn(() => Promise.resolve({ data: null, error: opts.upsertError ?? null }))

  mockFrom.mockImplementation(() => {
    fromCallCount++
    return fromCallCount === 1 ? adminChain : chain
  })

  return { adminChain, chain }
}

describe('settings.getPricingConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('retorna defaults si no hay sesion', async () => {
    vi.mocked(await import('@/lib/auth')).auth.api.getSession = vi.fn().mockResolvedValue(null)

    const { getPricingConfig } = await import('@/lib/settings')
    const cfg = await getPricingConfig()
    expect(cfg).toEqual({ amount: 17000, currency: 'ARS', dueDay: 1 })
  })

  it('parsea correctamente rows validos de site_settings', async () => {
    vi.mocked(await import('@/lib/auth')).auth.api.getSession = vi.fn().mockResolvedValue({
      user: { id: 'u1', email: 'a@b.com' },
    })

    setupForGetPricingConfig([
      { key: 'monthly_fee',     value: 25000 },
      { key: 'currency',        value: 'USD' },
      { key: 'payment_due_day', value: 15 },
    ])

    const { getPricingConfig } = await import('@/lib/settings')
    const cfg = await getPricingConfig()
    expect(cfg).toEqual({ amount: 25000, currency: 'USD', dueDay: 15 })
  })

  it('clampea amount negativo a 0', async () => {
    vi.mocked(await import('@/lib/auth')).auth.api.getSession = vi.fn().mockResolvedValue({
      user: { id: 'u1', email: 'a@b.com' },
    })

    setupForGetPricingConfig([
      { key: 'monthly_fee',     value: -100 },
      { key: 'currency',        value: 'ARS' },
      { key: 'payment_due_day', value: 1 },
    ])

    const { getPricingConfig } = await import('@/lib/settings')
    const cfg = await getPricingConfig()
    expect(cfg.amount).toBe(0)
  })

  it('clampea dueDay a 1-28', async () => {
    vi.mocked(await import('@/lib/auth')).auth.api.getSession = vi.fn().mockResolvedValue({
      user: { id: 'u1', email: 'a@b.com' },
    })

    setupForGetPricingConfig([
      { key: 'monthly_fee',     value: 17000 },
      { key: 'currency',        value: 'ARS' },
      { key: 'payment_due_day', value: 45 },
    ])

    const { getPricingConfig } = await import('@/lib/settings')
    const cfg = await getPricingConfig()
    expect(cfg.dueDay).toBe(28)
  })

  it('rechaza currency no soportada y usa default', async () => {
    vi.mocked(await import('@/lib/auth')).auth.api.getSession = vi.fn().mockResolvedValue({
      user: { id: 'u1', email: 'a@b.com' },
    })

    setupForGetPricingConfig([
      { key: 'monthly_fee',     value: 17000 },
      { key: 'currency',        value: 'XYZ' },
      { key: 'payment_due_day', value: 1 },
    ])

    const { getPricingConfig } = await import('@/lib/settings')
    const cfg = await getPricingConfig()
    expect(cfg.currency).toBe('ARS')
  })

  it('retorna defaults si la query falla con error', async () => {
    vi.mocked(await import('@/lib/auth')).auth.api.getSession = vi.fn().mockResolvedValue({
      user: { id: 'u1', email: 'a@b.com' },
    })

    const chain: Record<string, any> = {}
    chain.select = vi.fn(() => Promise.resolve({ data: null, error: { message: 'DB error' } }))
    mockFrom.mockReturnValue(chain)

    const { getPricingConfig } = await import('@/lib/settings')
    const cfg = await getPricingConfig()
    expect(cfg).toEqual({ amount: 17000, currency: 'ARS', dueDay: 1 })
  })

  it('retorna defaults si rows es null (DB vacia)', async () => {
    vi.mocked(await import('@/lib/auth')).auth.api.getSession = vi.fn().mockResolvedValue({
      user: { id: 'u1', email: 'a@b.com' },
    })

    setupForGetPricingConfig(null)

    const { getPricingConfig } = await import('@/lib/settings')
    const cfg = await getPricingConfig()
    expect(cfg).toEqual({ amount: 17000, currency: 'ARS', dueDay: 1 })
  })
})

describe('settings.updatePricingConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('throws si no hay sesion', async () => {
    vi.mocked(await import('@/lib/auth')).auth.api.getSession = vi.fn().mockResolvedValue(null)

    const { updatePricingConfig } = await import('@/lib/settings')
    await expect(updatePricingConfig({ amount: 20000 })).rejects.toThrow(/No active session/)
  })

  it('throws si el usuario no es admin', async () => {
    vi.mocked(await import('@/lib/auth')).auth.api.getSession = vi.fn().mockResolvedValue({
      user: { id: 'u1', email: 'atleta@b.com' },
    })

    setupForUpdatePricingConfig({ adminRole: 'atleta' })

    const { updatePricingConfig } = await import('@/lib/settings')
    await expect(updatePricingConfig({ amount: 20000 })).rejects.toThrow(/Admin access required/)
  })

  it('persiste cambios cuando el usuario es admin', async () => {
    vi.mocked(await import('@/lib/auth')).auth.api.getSession = vi.fn().mockResolvedValue({
      user: { id: 'admin-1', email: 'admin@b.com' },
    })

    const { chain } = setupForUpdatePricingConfig({
      adminRole: 'admin',
      finalRows: [
        { key: 'monthly_fee',     value: 22000 },
        { key: 'currency',        value: 'ARS' },
        { key: 'payment_due_day', value: 5 },
      ],
    })

    const { updatePricingConfig } = await import('@/lib/settings')
    const result = await updatePricingConfig({ amount: 22000, dueDay: 5 })
    expect(result.amount).toBe(22000)
    expect(result.dueDay).toBe(5)
    expect(chain.upsert).toHaveBeenCalled()
  })

  it('clampea dueDay a 1-28 antes de persistir', async () => {
    vi.mocked(await import('@/lib/auth')).auth.api.getSession = vi.fn().mockResolvedValue({
      user: { id: 'admin-1', email: 'admin@b.com' },
    })

    const { chain } = setupForUpdatePricingConfig({
      adminRole: 'admin',
      finalRows: [
        { key: 'monthly_fee',     value: 17000 },
        { key: 'currency',        value: 'ARS' },
        { key: 'payment_due_day', value: 28 },
      ],
    })

    const { updatePricingConfig } = await import('@/lib/settings')
    await updatePricingConfig({ dueDay: 50 })

    expect(chain.upsert).toHaveBeenCalled()
    const upsertCall = (chain.upsert as any).mock.calls[0][0] as any[]
    const dueDayRow = upsertCall.find((r: any) => r.key === 'payment_due_day')
    expect(dueDayRow).toBeTruthy()
    expect(dueDayRow.value).toBe(28)
  })

  it('clampea amount negativo a 0', async () => {
    vi.mocked(await import('@/lib/auth')).auth.api.getSession = vi.fn().mockResolvedValue({
      user: { id: 'admin-1', email: 'admin@b.com' },
    })

    const { chain } = setupForUpdatePricingConfig({
      adminRole: 'admin',
      finalRows: [
        { key: 'monthly_fee',     value: 0 },
        { key: 'currency',        value: 'ARS' },
        { key: 'payment_due_day', value: 1 },
      ],
    })

    const { updatePricingConfig } = await import('@/lib/settings')
    await updatePricingConfig({ amount: -5000 })

    expect(chain.upsert).toHaveBeenCalled()
    const upsertCall = (chain.upsert as any).mock.calls[0][0] as any[]
    const amountRow = upsertCall.find((r: any) => r.key === 'monthly_fee')
    expect(amountRow.value).toBe(0)
  })

  it('no hace upsert si no se pasa ningun cambio', async () => {
    vi.mocked(await import('@/lib/auth')).auth.api.getSession = vi.fn().mockResolvedValue({
      user: { id: 'admin-1', email: 'admin@b.com' },
    })

    const { chain } = setupForUpdatePricingConfig({
      adminRole: 'admin',
      finalRows: [
        { key: 'monthly_fee',     value: 17000 },
        { key: 'currency',        value: 'ARS' },
        { key: 'payment_due_day', value: 1 },
      ],
    })

    const { updatePricingConfig } = await import('@/lib/settings')
    await updatePricingConfig({})

    expect(chain.upsert).not.toHaveBeenCalled()
  })

  it('throws si upsert falla', async () => {
    vi.mocked(await import('@/lib/auth')).auth.api.getSession = vi.fn().mockResolvedValue({
      user: { id: 'admin-1', email: 'admin@b.com' },
    })

    setupForUpdatePricingConfig({
      adminRole: 'admin',
      upsertError: { message: 'RLS violation' },
    })

    const { updatePricingConfig } = await import('@/lib/settings')
    await expect(updatePricingConfig({ amount: 20000 })).rejects.toThrow()
  })
})
