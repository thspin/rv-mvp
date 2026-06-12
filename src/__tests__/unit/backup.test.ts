import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockQuery = vi.fn()
const mockPoolEnd = vi.fn()
const mockUpload = vi.fn()
const mockList = vi.fn()
const mockRemove = vi.fn()
const mockCaptureException = vi.fn()

function PoolMock() {
  return {
    query: mockQuery,
    end: mockPoolEnd,
  }
}

vi.mock('pg', () => ({
  Pool: PoolMock,
}))

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: () => ({
    storage: {
      from: () => ({
        upload: mockUpload,
        list: mockList,
        remove: mockRemove,
      }),
    },
  }),
}))

vi.mock('@sentry/nextjs', () => ({
  captureException: mockCaptureException,
}))

const ORIGINAL_ENV = process.env

describe('backup', () => {
  beforeEach(() => {
    vi.resetModules()
    mockQuery.mockReset()
    mockPoolEnd.mockReset()
    mockUpload.mockReset()
    mockList.mockReset()
    mockRemove.mockReset()
    mockCaptureException.mockReset()
    mockPoolEnd.mockResolvedValue(undefined)
    process.env = { ...ORIGINAL_ENV, DATABASE_URL: 'postgres://test:test@localhost:5432/db' }
  })

  describe('createBackup', () => {
    it('consulta todas las tablas en paralelo y sube a Storage', async () => {
      mockQuery.mockResolvedValue({ rows: [{ data: [] }] })
      mockUpload.mockResolvedValue({ error: null })

      const { createBackup } = await import('@/lib/backup')
      const result = await createBackup()

      expect(result.success).toBe(true)
      expect(result.totalFilas).toBe(0)
      expect(result.nombreArchivo).toMatch(/^backup-\d{4}-\d{2}-\d{2}\.json\.gz$/)
      expect(result.tablas).toHaveProperty('user')
      expect(result.tablas).toHaveProperty('athletes')
      // TABLAS is now 5: user, teams, athletes, payments, notifications
      // (session, account, verification are excluded — see SECURITY.md)
      expect(mockQuery).toHaveBeenCalledTimes(5)
      expect(mockUpload).toHaveBeenCalledTimes(1)
      expect(mockPoolEnd).toHaveBeenCalled()
    })

    it('excludes session / account / verification from the dump (no token exfil via backup)', async () => {
      mockQuery.mockResolvedValue({ rows: [{ data: [] }] })
      mockUpload.mockResolvedValue({ error: null })

      const { createBackup } = await import('@/lib/backup')
      await createBackup()

      const sqls = mockQuery.mock.calls.map((c) => String(c[0] ?? ''))
      expect(sqls.some((s) => s.includes('"session"'))).toBe(false)
      expect(sqls.some((s) => s.includes('"account"'))).toBe(false)
      expect(sqls.some((s) => s.includes('"verification"'))).toBe(false)
    })

    it('cuenta filas correctamente', async () => {
      mockQuery.mockImplementation(async (sql: string) => {
        if (sql.includes('"user"')) return { rows: [{ data: [{}, {}, {}] }] }
        if (sql.includes('"athletes"')) return { rows: [{ data: [{}, {}] }] }
        return { rows: [{ data: [] }] }
      })
      mockUpload.mockResolvedValue({ error: null })

      const { createBackup } = await import('@/lib/backup')
      const result = await createBackup()

      expect(result.totalFilas).toBe(5)
      expect(result.tablas.user).toBe(3)
      expect(result.tablas.athletes).toBe(2)
    })

    it('sube contenido gzip con contentType correcto', async () => {
      mockQuery.mockResolvedValue({ rows: [{ data: [{ id: 1 }] }] })
      mockUpload.mockResolvedValue({ error: null })

      const { createBackup } = await import('@/lib/backup')
      await createBackup()

      const call = mockUpload.mock.calls[0]
      expect(call[0]).toMatch(/^backup-\d{4}-\d{2}-\d{2}\.json\.gz$/)
      expect(call[2]).toEqual({
        contentType: 'application/gzip',
        upsert: true,
      })
      expect(Buffer.isBuffer(call[1])).toBe(true)
    })

    it('captura error en Sentry cuando falla el upload', async () => {
      mockQuery.mockResolvedValue({ rows: [{ data: [] }] })
      mockUpload.mockResolvedValue({ error: { message: 'bucket not found' } })

      const { createBackup } = await import('@/lib/backup')
      await expect(createBackup()).rejects.toThrow('bucket not found')
      expect(mockCaptureException).toHaveBeenCalled()
      expect(mockPoolEnd).toHaveBeenCalled()
    })

    it('lanza error claro si DATABASE_URL no esta configurada', async () => {
      delete process.env.DATABASE_URL
      const { createBackup } = await import('@/lib/backup')
      await expect(createBackup()).rejects.toThrow('DATABASE_URL no configurada')
    })

    it('sanitiza whitespace en DATABASE_URL', async () => {
      process.env.DATABASE_URL = 'postgres://user@host/db\r\n'
      mockQuery.mockResolvedValue({ rows: [{ data: [] }] })
      mockUpload.mockResolvedValue({ error: null })

      const { createBackup } = await import('@/lib/backup')
      await createBackup()
      expect(mockQuery).toHaveBeenCalled()
    })
  })

  describe('cleanOldBackups', () => {
    it('no elimina archivos recientes', async () => {
      const hoy = new Date().toISOString().split('T')[0]
      mockList.mockResolvedValue({
        data: [{ name: `backup-${hoy}.json.gz` }],
        error: null,
      })

      const { cleanOldBackups } = await import('@/lib/backup')
      const result = await cleanOldBackups()
      expect(result.eliminados).toBe(0)
      expect(mockRemove).not.toHaveBeenCalled()
    })

    it('elimina archivos con mas de 7 dias', async () => {
      const fechaVieja = new Date()
      fechaVieja.setDate(fechaVieja.getDate() - 10)
      const fechaViejaStr = fechaVieja.toISOString().split('T')[0]

      mockList.mockResolvedValue({
        data: [
          { name: `backup-${fechaViejaStr}.json.gz` },
          { name: 'backup-2020-01-01.json.gz' },
        ],
        error: null,
      })
      mockRemove.mockResolvedValue({ error: null })

      const { cleanOldBackups } = await import('@/lib/backup')
      const result = await cleanOldBackups()
      expect(result.eliminados).toBe(2)
      expect(mockRemove).toHaveBeenCalledWith([
        `backup-${fechaViejaStr}.json.gz`,
        'backup-2020-01-01.json.gz',
      ])
    })

    it('no toca archivos que no son backups', async () => {
      mockList.mockResolvedValue({
        data: [
          { name: 'foto.jpg' },
          { name: 'recibo-2026-06-12.pdf' },
        ],
        error: null,
      })

      const { cleanOldBackups } = await import('@/lib/backup')
      const result = await cleanOldBackups()
      expect(result.eliminados).toBe(0)
      expect(mockRemove).not.toHaveBeenCalled()
    })
  })
})
