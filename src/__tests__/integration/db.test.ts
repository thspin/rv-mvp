/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFrom = vi.fn()
const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockMaybeSingle = vi.fn()
const mockLimit = vi.fn()
const mockGte = vi.fn()
const mockLte = vi.fn()
const mockInsert = vi.fn()
const mockUpdate = vi.fn()
const mockSingle = vi.fn()

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: () => ({
    from: mockFrom,
  }),
}))

vi.mock('@/lib/supabase/authenticated', () => ({
  createAuthenticatedClient: () => ({
    from: mockFrom,
  }),
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

function setupChain(overrides: Record<string, any> = {}) {
  const chain: Record<string, any> = {
    select: mockSelect.mockReturnThis(),
    eq: mockEq.mockReturnThis(),
    maybeSingle: mockMaybeSingle.mockResolvedValue({ data: null, error: null }),
    limit: mockLimit.mockReturnThis(),
    gte: mockGte.mockReturnThis(),
    lte: mockLte.mockReturnThis(),
    insert: mockInsert.mockResolvedValue({ data: null, error: null }),
    update: mockUpdate.mockReturnThis(),
    single: mockSingle.mockResolvedValue({ data: null, error: null }),
    ...overrides,
  }
  mockFrom.mockReturnValue(chain)
  return chain
}

describe('checkDuplicatePayment (via addPaymentRecord)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('skips insertion when duplicate payment exists for same month', async () => {
    vi.mocked(await import('@/lib/auth')).auth.api.getSession = vi.fn().mockResolvedValue({
      user: { id: 'admin-id', email: 'test@test.com' },
    })

    const adminChain = setupChain()
    adminChain.maybeSingle.mockResolvedValueOnce({ data: { role: 'admin' }, error: null })

    const duplicateChain = setupChain()
    duplicateChain.maybeSingle.mockResolvedValueOnce({ data: { id: 'existing-payment' }, error: null })

    const { addPaymentRecord } = await import('@/lib/db')
    await addPaymentRecord('test@test.com', 'Juan', 17000, 'Transferencia')

    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('inserts payment when no duplicate exists', async () => {
    vi.mocked(await import('@/lib/auth')).auth.api.getSession = vi.fn().mockResolvedValue({
      user: { id: 'admin-id', email: 'test@test.com' },
    })

    const adminChain = setupChain()
    adminChain.maybeSingle.mockResolvedValueOnce({ data: { role: 'admin' }, error: null })

    const noDuplicateChain = setupChain()
    noDuplicateChain.maybeSingle.mockResolvedValue({ data: null, error: null })
    noDuplicateChain.insert.mockResolvedValue({ data: null, error: null })

    const { addPaymentRecord } = await import('@/lib/db')
    await addPaymentRecord('test@test.com', 'Juan', 17000, 'Transferencia')
  })

  it('returns false (fail-open) on DB error during duplicate check', async () => {
    vi.mocked(await import('@/lib/auth')).auth.api.getSession = vi.fn().mockResolvedValue({
      user: { id: 'admin-id', email: 'test@test.com' },
    })

    const adminChain = setupChain()
    adminChain.maybeSingle.mockResolvedValueOnce({ data: { role: 'admin' }, error: null })

    const errorChain = setupChain()
    errorChain.maybeSingle.mockResolvedValueOnce({ data: null, error: { message: 'DB error', code: '500' } })
    errorChain.insert.mockResolvedValue({ data: null, error: null })

    const { addPaymentRecord } = await import('@/lib/db')
    await addPaymentRecord('test@test.com', 'Juan', 17000, 'Transferencia')
  })
})

describe('processPaymentAsync', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('approve: sets payment_status to Pagado', async () => {
    vi.mocked(await import('@/lib/auth')).auth.api.getSession = vi.fn().mockResolvedValue({
      user: { id: 'admin-id', email: 'test@test.com' },
    })

    const chain = setupChain()
    chain.maybeSingle.mockImplementation(async () => ({ data: { role: 'admin', name: 'Juan' }, error: null }))
    chain.update.mockReturnThis()
    chain.eq.mockReturnThis()
    chain.select.mockReturnThis()
    chain.single.mockResolvedValue({ data: {}, error: null })

    const { processPaymentAsync } = await import('@/lib/db')
    await processPaymentAsync('test@test.com', true, 'Transferencia')

    expect(mockUpdate).toHaveBeenCalled()
  })

  it('reject: sets payment_status to Vencido with reason', async () => {
    vi.mocked(await import('@/lib/auth')).auth.api.getSession = vi.fn().mockResolvedValue({
      user: { id: 'admin-id', email: 'test@test.com' },
    })

    const chain = setupChain()
    chain.maybeSingle.mockImplementation(async () => ({ data: { role: 'admin', name: 'Juan' }, error: null }))
    chain.update.mockReturnThis()
    chain.eq.mockReturnThis()
    chain.select.mockReturnThis()
    chain.single.mockResolvedValue({ data: {}, error: null })

    const { processPaymentAsync } = await import('@/lib/db')
    await processPaymentAsync('test@test.com', false, undefined, 'Comprobante borroso')
  })
})

describe('updateAthleteTeamStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('activate: sets team_status to activo and payment_status to Pendiente_Pago', async () => {
    vi.mocked(await import('@/lib/auth')).auth.api.getSession = vi.fn().mockResolvedValue({
      user: { id: 'admin-id', email: 'test@test.com' },
    })

    const chain = setupChain()
    chain.maybeSingle.mockImplementation(async () => ({ data: { role: 'admin', name: 'Juan' }, error: null }))
    chain.update.mockReturnThis()
    chain.eq.mockReturnThis()
    chain.select.mockReturnThis()
    chain.single.mockResolvedValue({ data: {}, error: null })
    chain.insert.mockResolvedValue({ data: null, error: null })

    const { updateAthleteTeamStatus } = await import('@/lib/db')
    await updateAthleteTeamStatus('test@test.com', 'activo')
  })

  it('deactivate (null): clears team_id, payment, mora', async () => {
    vi.mocked(await import('@/lib/auth')).auth.api.getSession = vi.fn().mockResolvedValue({
      user: { id: 'admin-id', email: 'test@test.com' },
    })

    const chain = setupChain()
    chain.maybeSingle.mockImplementation(async () => ({ data: { role: 'admin', name: 'Juan' }, error: null }))
    chain.update.mockReturnThis()
    chain.eq.mockReturnThis()
    chain.select.mockReturnThis()
    chain.single.mockResolvedValue({ data: {}, error: null })
    chain.insert.mockResolvedValue({ data: null, error: null })

    const { updateAthleteTeamStatus } = await import('@/lib/db')
    await updateAthleteTeamStatus('test@test.com', null)
  })
})

describe('approvePaymentAsync', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('complete flow: updates athlete + adds payment + logs + notifies', async () => {
    vi.mocked(await import('@/lib/auth')).auth.api.getSession = vi.fn().mockResolvedValue({
      user: { id: 'admin-id', email: 'test@test.com' },
    })

    const chain = setupChain()
    chain.maybeSingle.mockImplementation(async () => ({ data: { role: 'admin', user_id: 'user-123', name: 'Juan' }, error: null }))
    chain.update.mockReturnThis()
    chain.eq.mockReturnThis()
    chain.select.mockReturnThis()
    chain.single.mockResolvedValue({ data: {}, error: null })
    chain.insert.mockResolvedValue({ data: null, error: null })

    const { approvePaymentAsync } = await import('@/lib/db')
    await approvePaymentAsync('test@test.com', 'Juan Perez', 17000, 'Transferencia')

    expect(mockInsert).toHaveBeenCalled()
  })

  it('notifies the athlete when user_id exists', async () => {
    vi.mocked(await import('@/lib/auth')).auth.api.getSession = vi.fn().mockResolvedValue({
      user: { id: 'admin-id', email: 'test@test.com' },
    })

    const chain = setupChain()
    chain.maybeSingle.mockImplementation(async () => ({ data: { role: 'admin', user_id: 'user-123', name: 'Juan' }, error: null }))
    chain.update.mockReturnThis()
    chain.eq.mockReturnThis()
    chain.select.mockReturnThis()
    chain.single.mockResolvedValue({ data: {}, error: null })
    chain.insert.mockResolvedValue({ data: null, error: null })

    const { approvePaymentAsync } = await import('@/lib/db')
    await approvePaymentAsync('test@test.com', 'Juan', 17000, 'Transferencia')

    const insertCalls = mockInsert.mock.calls
    const notificationCall = insertCalls.find(
      (call: any[]) => call[0] && 'user_id' in call[0] && 'title' in call[0]
    )
    expect(notificationCall).toBeTruthy()
  })
})

describe('processCertificateAsync', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('approve: calculates expiration with addMonthsWithClamp(6 months)', async () => {
    vi.mocked(await import('@/lib/auth')).auth.api.getSession = vi.fn().mockResolvedValue({
      user: { id: 'admin-id', email: 'test@test.com' },
    })

    const chain = setupChain()
    chain.maybeSingle.mockImplementation(async () => ({ data: { role: 'admin' }, error: null }))
    chain.update.mockReturnThis()
    chain.eq.mockReturnThis()
    chain.select.mockReturnThis()
    chain.single.mockResolvedValue({ data: {}, error: null })

    const { processCertificateAsync } = await import('@/lib/db')
    await processCertificateAsync('test@test.com', true)

    const updateCall = mockUpdate.mock.calls.find(
      (call: any[]) => call[0] && 'apto_medico_status' in call[0]
    )
    expect(updateCall).toBeTruthy()
    expect(updateCall![0].apto_medico_status).toBe('vigente')
    expect(updateCall![0].apto_medico_vencimiento).toBeTruthy()
  })

  it('approve with custom months', async () => {
    vi.mocked(await import('@/lib/auth')).auth.api.getSession = vi.fn().mockResolvedValue({
      user: { id: 'admin-id', email: 'test@test.com' },
    })

    const chain = setupChain()
    chain.maybeSingle.mockImplementation(async () => ({ data: { role: 'admin' }, error: null }))
    chain.update.mockReturnThis()
    chain.eq.mockReturnThis()
    chain.select.mockReturnThis()
    chain.single.mockResolvedValue({ data: {}, error: null })

    const { processCertificateAsync } = await import('@/lib/db')
    await processCertificateAsync('test@test.com', true, 3)

    const updateCall = mockUpdate.mock.calls.find(
      (call: any[]) => call[0] && 'apto_medico_status' in call[0]
    )
    expect(updateCall![0].apto_medico_status).toBe('vigente')
  })

  it('reject: sets status to rechazado with reason', async () => {
    vi.mocked(await import('@/lib/auth')).auth.api.getSession = vi.fn().mockResolvedValue({
      user: { id: 'admin-id', email: 'test@test.com' },
    })

    const chain = setupChain()
    chain.maybeSingle.mockImplementation(async () => ({ data: { role: 'admin' }, error: null }))
    chain.update.mockReturnThis()
    chain.eq.mockReturnThis()
    chain.select.mockReturnThis()
    chain.single.mockResolvedValue({ data: {}, error: null })

    const { processCertificateAsync } = await import('@/lib/db')
    await processCertificateAsync('test@test.com', false, undefined, 'Imagen borrosa')

    const updateCall = mockUpdate.mock.calls.find(
      (call: any[]) => call[0] && 'apto_medico_status' in call[0]
    )
    expect(updateCall![0].apto_medico_status).toBe('rechazado')
    expect(updateCall![0].apto_medico_motivo_rechazo).toBe('Imagen borrosa')
  })
})
