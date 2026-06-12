import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mockSetUser = vi.fn()
const mockAddBreadcrumb = vi.fn()

vi.mock('@sentry/nextjs', () => ({
  setUser: mockSetUser,
  addBreadcrumb: mockAddBreadcrumb,
}))

describe('sentry-utils', () => {
  beforeEach(() => {
    mockSetUser.mockReset()
    mockAddBreadcrumb.mockReset()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('setUserContext', () => {
    it('setea contexto cuando hay usuario', async () => {
      const { setUserContext } = await import('@/lib/sentry-utils')
      setUserContext({ id: 'u1', email: 'a@b.com', name: 'Ana', role: 'atleta' })
      expect(mockSetUser).toHaveBeenCalledWith({
        id: 'u1',
        email: 'a@b.com',
        username: 'Ana',
        role: 'atleta',
      })
    })

    it('limpia el contexto cuando se pasa null', async () => {
      const { setUserContext } = await import('@/lib/sentry-utils')
      setUserContext(null)
      expect(mockSetUser).toHaveBeenCalledWith(null)
    })

    it('no hace nada si el usuario no tiene id', async () => {
      const { setUserContext } = await import('@/lib/sentry-utils')
      setUserContext({ id: '', email: 'a@b.com', name: 'Ana', role: 'atleta' })
      expect(mockSetUser).toHaveBeenCalledWith(null)
    })
  })

  describe('addBreadcrumb', () => {
    it('agrega breadcrumb sin data', async () => {
      const { addBreadcrumb } = await import('@/lib/sentry-utils')
      addBreadcrumb('Pago iniciado')
      expect(mockAddBreadcrumb).toHaveBeenCalledWith({
        message: 'Pago iniciado',
        data: undefined,
        level: 'info',
      })
    })

    it('agrega breadcrumb con data', async () => {
      const { addBreadcrumb } = await import('@/lib/sentry-utils')
      addBreadcrumb('Subiendo archivo', { bucket: 'receipts', size: 1024 })
      expect(mockAddBreadcrumb).toHaveBeenCalledWith({
        message: 'Subiendo archivo',
        data: { bucket: 'receipts', size: 1024 },
        level: 'info',
      })
    })
  })
})
