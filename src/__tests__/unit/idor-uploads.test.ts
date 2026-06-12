import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/auth', () => ({
  auth: { api: { getSession: vi.fn() } },
}))

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: () => ({}),
}))

vi.mock('@/lib/supabase/authenticated', () => ({
  createAuthenticatedClient: () => ({}),
}))

vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}))

const mockRateLimit = vi.fn()

vi.mock('@/lib/rate-limit', () => ({
  rateLimitAction: (...args: unknown[]) => mockRateLimit(...args),
}))

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}))

const mockUpdate = vi.fn()
const mockEq = vi.fn()

function setupChain() {
  mockUpdate.mockReturnValue({ eq: mockEq })
  mockEq.mockResolvedValue({ data: null, error: null })
}

const ORIGINAL_ENV = process.env

describe('assertFilenameOwnership (via uploadPaymentReceiptAsync)', () => {
  beforeEach(() => {
    vi.resetModules()
    process.env = { ...ORIGINAL_ENV }
    vi.clearAllMocks()
    setupChain()
    mockRateLimit.mockResolvedValue({ success: true })
  })

  afterEach(() => {
    process.env = ORIGINAL_ENV
  })

  async function callAs(userEmail: string, receiptName: string) {
    const { auth } = await import('@/lib/auth')
    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: { id: 'user-123', email: userEmail },
    } as unknown as Awaited<ReturnType<typeof auth.api.getSession>>)

    const { uploadPaymentReceiptAsync } = await import('@/lib/db')
    return await uploadPaymentReceiptAsync(userEmail, receiptName)
  }

  it('accepts a filename with the session user safeEmail prefix', async () => {
    const result = await callAs('user@example.com', 'user_example_com_1700000000_abcd1234.jpg')
    expect(result.success).toBe(true)
  })

  it('rejects a filename from a different user (regression of the IDOR)', async () => {
    const result = await callAs('attacker@example.com', 'victim_example_com_1700000000_abcd1234.jpg')
    expect(result.success).toBe(false)
    expect(result.error).toContain('Forbidden')
  })

  it('rejects a filename that does not have a valid prefix at all', async () => {
    const result = await callAs('user@example.com', 'random-filename.jpg')
    expect(result.success).toBe(false)
    expect(result.error).toContain('Forbidden')
  })

  it('rejects path traversal attempts', async () => {
    const result = await callAs('user@example.com', 'user_example_com_../../etc/passwd')
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/path traversal|Forbidden/i)
  })

  it('rejects backslash path traversal', async () => {
    const result = await callAs('user@example.com', 'user_example_com_..\\..\\windows\\system32')
    expect(result.success).toBe(false)
  })

  it('rejects an empty filename', async () => {
    const result = await callAs('user@example.com', '')
    expect(result.success).toBe(false)
  })
})
