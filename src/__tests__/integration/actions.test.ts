/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFrom = vi.fn()
const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockMaybeSingle = vi.fn()
const mockUpdate = vi.fn()
const mockUpsert = vi.fn()
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
    update: mockUpdate.mockReturnThis(),
    upsert: mockUpsert.mockReturnThis(),
    single: mockSingle.mockResolvedValue({ data: null, error: null }),
    ...overrides,
  }
  mockFrom.mockReturnValue(chain)
  return chain
}

describe('getCurrentUserActionDetailed', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('returns NO_SESSION when no session exists', async () => {
    const { auth } = await import('@/lib/auth')
    vi.mocked(auth.api.getSession).mockResolvedValue(null)

    const { getCurrentUserActionDetailed } = await import('@/lib/actions')
    const result = await getCurrentUserActionDetailed()

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.code).toBe('NO_SESSION')
    }
  })

  it('returns athlete data when found by user_id', async () => {
    const { auth } = await import('@/lib/auth')
    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: { id: 'user-123', email: 'test@test.com', name: 'Juan', image: null },
    } as any)

    const chain = setupChain()
    chain.maybeSingle.mockResolvedValueOnce({
      data: {
        id: 'athlete-1',
        user_id: 'user-123',
        email: 'test@test.com',
        name: 'Juan',
        role: 'atleta',
        onboarding_complete: true,
      },
      error: null,
    })

    const { getCurrentUserActionDetailed } = await import('@/lib/actions')
    const result = await getCurrentUserActionDetailed()

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.email).toBe('test@test.com')
      expect(result.data.name).toBe('Juan')
    }
  })

  it('links by email when not found by user_id', async () => {
    const { auth } = await import('@/lib/auth')
    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: { id: 'user-123', email: 'test@test.com', name: 'Juan', image: null },
    } as any)

    const chain = setupChain()
    chain.maybeSingle
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({
        data: {
          id: 'athlete-1',
          user_id: null,
          email: 'test@test.com',
          name: 'Juan',
          role: 'atleta',
          onboarding_complete: false,
        },
        error: null,
      })
    chain.single.mockResolvedValueOnce({
      data: {
        id: 'athlete-1',
        user_id: 'user-123',
        email: 'test@test.com',
        name: 'Juan',
        role: 'atleta',
        onboarding_complete: false,
      },
      error: null,
    })

    const { getCurrentUserActionDetailed } = await import('@/lib/actions')
    const result = await getCurrentUserActionDetailed()

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.email).toBe('test@test.com')
    }
  })

  it('creates new athlete when no existing record found', async () => {
    const { auth } = await import('@/lib/auth')
    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: { id: 'user-123', email: 'test@test.com', name: 'Juan', image: null },
    } as any)

    const chain = setupChain()
    chain.maybeSingle
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: null, error: null })
    chain.single.mockResolvedValueOnce({
      data: {
        id: 'new-athlete',
        user_id: 'user-123',
        email: 'test@test.com',
        name: 'Juan',
        role: 'atleta',
        onboarding_complete: false,
        apto_medico_status: 'no_entregado',
      },
      error: null,
    })

    const { getCurrentUserActionDetailed } = await import('@/lib/actions')
    const result = await getCurrentUserActionDetailed()

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).toBe('Juan')
    }
  })

  it('returns DB_ERROR when athletes lookup fails', async () => {
    const { auth } = await import('@/lib/auth')
    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: { id: 'user-123', email: 'test@test.com', name: 'Juan', image: null },
    } as any)

    const chain = setupChain()
    chain.maybeSingle.mockResolvedValueOnce({
      data: null,
      error: { message: 'Connection failed', code: '500' },
    })

    const { getCurrentUserActionDetailed } = await import('@/lib/actions')
    const result = await getCurrentUserActionDetailed()

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.code).toBe('DB_ERROR')
    }
  })
})

describe('requestJoinTeamAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('returns NO_SESSION when no session', async () => {
    const { auth } = await import('@/lib/auth')
    vi.mocked(auth.api.getSession).mockResolvedValue(null)

    const { requestJoinTeamAction } = await import('@/lib/actions')
    const result = await requestJoinTeamAction('team-123')

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.code).toBe('NO_SESSION')
    }
  })

  it('updates team_id and team_status with valid session', async () => {
    const { auth } = await import('@/lib/auth')
    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: { id: 'user-123', email: 'test@test.com', name: 'Juan', image: null },
    } as any)

    const chain = setupChain()
    chain.single.mockResolvedValueOnce({
      data: {
        id: 'athlete-1',
        user_id: 'user-123',
        email: 'test@test.com',
        name: 'Juan',
        role: 'atleta',
        onboarding_complete: true,
        team_id: 'team-123',
        team_status: 'pendiente',
      },
      error: null,
    })

    const { requestJoinTeamAction } = await import('@/lib/actions')
    const result = await requestJoinTeamAction('team-123')

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.team_id).toBe('team-123')
      expect(result.data.team_status).toBe('pendiente')
    }
  })

  it('returns DB_ERROR on database failure', async () => {
    const { auth } = await import('@/lib/auth')
    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: { id: 'user-123', email: 'test@test.com', name: 'Juan', image: null },
    } as any)

    const chain = setupChain()
    chain.single.mockResolvedValueOnce({
      data: null,
      error: { message: 'Update failed', code: '500' },
    })

    const { requestJoinTeamAction } = await import('@/lib/actions')
    const result = await requestJoinTeamAction('team-123')

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.code).toBe('DB_ERROR')
    }
  })
})

describe('leaveTeamAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('returns NO_SESSION when no session', async () => {
    const { auth } = await import('@/lib/auth')
    vi.mocked(auth.api.getSession).mockResolvedValue(null)

    const { leaveTeamAction } = await import('@/lib/actions')
    const result = await leaveTeamAction()

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.code).toBe('NO_SESSION')
    }
  })

  it('clears team data with valid session', async () => {
    const { auth } = await import('@/lib/auth')
    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: { id: 'user-123', email: 'test@test.com', name: 'Juan', image: null },
    } as any)

    const chain = setupChain()
    chain.single.mockResolvedValueOnce({
      data: {
        id: 'athlete-1',
        user_id: 'user-123',
        email: 'test@test.com',
        name: 'Juan',
        role: 'atleta',
        onboarding_complete: true,
        team_id: null,
        team_status: null,
        payment_status: null,
      },
      error: null,
    })

    const { leaveTeamAction } = await import('@/lib/actions')
    const result = await leaveTeamAction()

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.team_id).toBeNull()
      expect(result.data.team_status).toBeNull()
      expect(result.data.payment_status).toBeNull()
    }
  })

  it('returns DB_ERROR on database failure', async () => {
    const { auth } = await import('@/lib/auth')
    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: { id: 'user-123', email: 'test@test.com', name: 'Juan', image: null },
    } as any)

    const chain = setupChain()
    chain.single.mockResolvedValueOnce({
      data: null,
      error: { message: 'Update failed', code: '500' },
    })

    const { leaveTeamAction } = await import('@/lib/actions')
    const result = await leaveTeamAction()

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.code).toBe('DB_ERROR')
    }
  })
})
