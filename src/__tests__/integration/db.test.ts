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

describe('checkUpcomingPaymentDues - idempotency', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('envia recordatorio para atleta con next_payment_due en T-3', async () => {
    vi.mocked(await import('@/lib/auth')).auth.api.getSession = vi.fn().mockResolvedValue({
      user: { id: 'admin-id', email: 'test@test.com' },
    })

    // Single shared chain. The function:
    //  1) calls .from('athletes').select(...).eq().neq().not()  -> chain.select resolves to athlete array
    //  2) for each athlete, .from('payment_reminder_log').insert({...}) -> chain.insert resolves ok
    // Because mockFrom returns the same chain for all .from() calls, we wire
    // both .select() and .insert() to do the right thing.
    const chain = setupChain()
    const t3 = new Date()
    t3.setHours(12, 0, 0, 0)
    t3.setDate(t3.getDate() + 3)
    const athletes = [
      { id: 'a1', user_id: 'u1', name: 'A1', email: 'a1@b.com', next_payment_due: t3.toISOString(), mora_months: 0 },
    ]
    chain.select.mockImplementation(() => ({
      eq: () => ({
        neq: () => ({
          not: () => Promise.resolve({ data: athletes, error: null }),
        }),
      }),
    }))
    chain.insert.mockResolvedValue({ data: null, error: null })

    const { checkUpcomingPaymentDues } = await import('@/lib/db-internal')
    const result = await checkUpcomingPaymentDues()
    expect(result.preDue3).toBe(1)
  })

  it('NO duplica recordatorio si el UNIQUE INDEX choca con 23505', async () => {
    vi.mocked(await import('@/lib/auth')).auth.api.getSession = vi.fn().mockResolvedValue({
      user: { id: 'admin-id', email: 'test@test.com' },
    })

    const chain = setupChain()
    const t3 = new Date()
    t3.setHours(12, 0, 0, 0)
    t3.setDate(t3.getDate() + 3)
    const athletes = [
      { id: 'a1', user_id: 'u1', name: 'A1', email: 'a1@b.com', next_payment_due: t3.toISOString(), mora_months: 0 },
    ]
    chain.select.mockImplementation(() => ({
      eq: () => ({
        neq: () => ({
          not: () => Promise.resolve({ data: athletes, error: null }),
        }),
      }),
    }))
    // First insert (athletes loop iterates per reminder type) succeeds.
    // If the cron runs again same day, UNIQUE INDEX choca con 23505.
    let callCount = 0
    chain.insert.mockImplementation(() => {
      callCount++
      if (callCount === 1) return Promise.resolve({ data: null, error: null })
      return Promise.resolve({ data: null, error: { code: '23505', message: 'duplicate key value violates unique constraint' } })
    })

    const { checkUpcomingPaymentDues } = await import('@/lib/db-internal')
    const r1 = await checkUpcomingPaymentDues()
    // Reset callCount to simulate second cron run same day
    const initialCalls = callCount
    const r2 = await checkUpcomingPaymentDues()

    // First run: 1 notification
    expect(r1.preDue3).toBe(1)
    // Second run: 0 notifications (23505 caught, no notification created)
    expect(r2.preDue3).toBe(0)
    expect(callCount).toBeGreaterThan(initialCalls) // we did try to insert
  })

  it('atletas con next_payment_due en T+0 incrementan dueToday', async () => {
    vi.mocked(await import('@/lib/auth')).auth.api.getSession = vi.fn().mockResolvedValue({
      user: { id: 'admin-id', email: 'test@test.com' },
    })

    const chain = setupChain()
    const today = new Date()
    today.setHours(12, 0, 0, 0)
    const athletes = [
      { id: 'a1', user_id: 'u1', name: 'A1', email: 'a1@b.com', next_payment_due: today.toISOString(), mora_months: 0 },
    ]
    chain.select.mockImplementation(() => ({
      eq: () => ({
        neq: () => ({
          not: () => Promise.resolve({ data: athletes, error: null }),
        }),
      }),
    }))
    chain.insert.mockResolvedValue({ data: null, error: null })

    const { checkUpcomingPaymentDues } = await import('@/lib/db-internal')
    const result = await checkUpcomingPaymentDues()
    expect(result.dueToday).toBe(1)
  })

  it('retorna counts en 0 cuando no hay candidatos', async () => {
    vi.mocked(await import('@/lib/auth')).auth.api.getSession = vi.fn().mockResolvedValue({
      user: { id: 'admin-id', email: 'test@test.com' },
    })

    const chain = setupChain()
    chain.select.mockImplementation(() => ({
      eq: () => ({
        neq: () => ({
          not: () => Promise.resolve({ data: [], error: null }),
        }),
      }),
    }))

    const { checkUpcomingPaymentDues } = await import('@/lib/db-internal')
    const result = await checkUpcomingPaymentDues()
    expect(result).toEqual({ preDue7: 0, preDue3: 0, dueToday: 0, overdue1: 0, overdue7: 0 })
  })

  it('salta atletas con daysLeft > 7 (no recordatorio todavia)', async () => {
    vi.mocked(await import('@/lib/auth')).auth.api.getSession = vi.fn().mockResolvedValue({
      user: { id: 'admin-id', email: 'test@test.com' },
    })

    const chain = setupChain()
    const future = new Date()
    future.setDate(future.getDate() + 15)
    const athletes = [
      { id: 'a1', user_id: 'u1', name: 'A1', email: 'a1@b.com', next_payment_due: future.toISOString(), mora_months: 0 },
    ]
    chain.select.mockImplementation(() => ({
      eq: () => ({
        neq: () => ({
          not: () => Promise.resolve({ data: athletes, error: null }),
        }),
      }),
    }))
    chain.insert.mockResolvedValue({ data: null, error: null })

    const { checkUpcomingPaymentDues } = await import('@/lib/db-internal')
    const result = await checkUpcomingPaymentDues()
    expect(result.preDue7).toBe(0)
    expect(result.preDue3).toBe(0)
    expect(result.dueToday).toBe(0)
  })

  it('mora: actualiza mora_months en meses (no dias) para atletas con next_payment_due en pasado', async () => {
    vi.mocked(await import('@/lib/auth')).auth.api.getSession = vi.fn().mockResolvedValue({
      user: { id: 'admin-id', email: 'test@test.com' },
    })

    const chain = setupChain()
    // 60 days in the past = 2 months of mora
    const past = new Date()
    past.setDate(past.getDate() - 60)
    const athletes = [
      { id: 'a1', user_id: 'u1', name: 'A1', email: 'a1@b.com', next_payment_due: past.toISOString(), mora_months: 0 },
    ]
    chain.select.mockImplementation(() => ({
      eq: () => ({
        neq: () => ({
          not: () => Promise.resolve({ data: athletes, error: null }),
        }),
      }),
    }))
    chain.insert.mockResolvedValue({ data: null, error: null })

    const { checkUpcomingPaymentDues } = await import('@/lib/db-internal')
    await checkUpcomingPaymentDues()

    // update should have been called for the mora update on the past-due athlete
    const updateCalls = mockUpdate.mock.calls
    const moraCall = updateCalls.find((call: any[]) => call[0] && 'mora_months' in call[0])
    expect(moraCall).toBeTruthy()
    expect(moraCall![0].mora_months).toBe(2)
    expect(moraCall![0].payment_status).toBe('Vencido')
  })
})
