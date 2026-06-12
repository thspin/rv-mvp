/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockGetSession = vi.fn()

vi.mock('@/lib/auth', () => ({
  auth: {
    api: {
      getSession: (...args: any[]) => mockGetSession(...args),
    },
  },
}))

vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve({ data: null, error: null }),
        }),
      }),
    }),
    storage: {
      from: () => ({
        upload: () => Promise.resolve({ data: null, error: null }),
        download: () => Promise.resolve({ data: new Blob(['test']), error: null }),
      }),
    },
  }),
}))

describe('POST /api/storage/upload — Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('returns 401 without session', async () => {
    mockGetSession.mockResolvedValue(null)

    const formData = new FormData()
    formData.append('bucket', 'receipts')

    const request = new NextRequest('http://localhost:3000/api/storage/upload', {
      method: 'POST',
      body: formData,
    })

    const { POST } = await import('@/app/api/storage/upload/route')
    const response = await POST(request)

    expect(response.status).toBe(401)
    const body = await response.json()
    expect(body.error).toBe('Unauthorized')
  })

  it('returns 400 when file is missing', async () => {
    mockGetSession.mockResolvedValue({
      user: { id: 'user-123', email: 'test@test.com' },
    })

    const formData = new FormData()
    formData.append('bucket', 'receipts')

    const request = new NextRequest('http://localhost:3000/api/storage/upload', {
      method: 'POST',
      body: formData,
    })

    const { POST } = await import('@/app/api/storage/upload/route')
    const response = await POST(request)

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toContain('required')
  })

  it('returns 403 for invalid bucket', async () => {
    mockGetSession.mockResolvedValue({
      user: { id: 'user-123', email: 'test@test.com' },
    })

    const formData = new FormData()
    const blob = new Blob(['test'], { type: 'image/jpeg' })
    formData.append('file', blob, 'test.jpg')
    formData.append('bucket', 'invalid-bucket')

    const request = new NextRequest('http://localhost:3000/api/storage/upload', {
      method: 'POST',
      body: formData,
    })

    const { POST } = await import('@/app/api/storage/upload/route')
    const response = await POST(request)

    expect(response.status).toBe(403)
    const body = await response.json()
    expect(body.error).toBe('Invalid bucket')
  })

  it('returns 400 for disallowed file type (.exe)', async () => {
    mockGetSession.mockResolvedValue({
      user: { id: 'user-123', email: 'test@test.com' },
    })

    const formData = new FormData()
    const blob = new Blob(['test'], { type: 'application/x-executable' })
    formData.append('file', blob, 'malware.exe')
    formData.append('bucket', 'receipts')

    const request = new NextRequest('http://localhost:3000/api/storage/upload', {
      method: 'POST',
      body: formData,
    })

    const { POST } = await import('@/app/api/storage/upload/route')
    const response = await POST(request)

    expect(response.status).toBe(400)
  })

  it('returns 400 for disallowed file type (.zip)', async () => {
    mockGetSession.mockResolvedValue({
      user: { id: 'user-123', email: 'test@test.com' },
    })

    const formData = new FormData()
    const blob = new Blob(['test'], { type: 'application/zip' })
    formData.append('file', blob, 'archive.zip')
    formData.append('bucket', 'receipts')

    const request = new NextRequest('http://localhost:3000/api/storage/upload', {
      method: 'POST',
      body: formData,
    })

    const { POST } = await import('@/app/api/storage/upload/route')
    const response = await POST(request)

    expect(response.status).toBe(400)
  })

  it('returns 400 for disallowed file type (.doc)', async () => {
    mockGetSession.mockResolvedValue({
      user: { id: 'user-123', email: 'test@test.com' },
    })

    const formData = new FormData()
    const blob = new Blob(['test'], { type: 'application/msword' })
    formData.append('file', blob, 'document.doc')
    formData.append('bucket', 'documents')

    const request = new NextRequest('http://localhost:3000/api/storage/upload', {
      method: 'POST',
      body: formData,
    })

    const { POST } = await import('@/app/api/storage/upload/route')
    const response = await POST(request)

    expect(response.status).toBe(400)
  })

  it('accepts only allowed buckets: receipts, medical-certs, avatars, documents', async () => {
    mockGetSession.mockResolvedValue({
      user: { id: 'user-123', email: 'test@test.com' },
    })

    const allowedBuckets = ['receipts', 'medical-certs', 'avatars', 'documents']

    for (const bucket of allowedBuckets) {
      vi.resetModules()
      const formData = new FormData()
      const blob = new Blob(['test'], { type: 'image/jpeg' })
      formData.append('file', blob, 'test.jpg')
      formData.append('bucket', bucket)

      const request = new NextRequest('http://localhost:3000/api/storage/upload', {
        method: 'POST',
        body: formData,
      })

      const { POST } = await import('@/app/api/storage/upload/route')
      const response = await POST(request)

      expect(response.status).not.toBe(403)
    }
  })
})

describe('GET /api/storage/[bucket] — Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('returns 401 without session', async () => {
    mockGetSession.mockResolvedValue(null)

    const request = new NextRequest(
      'http://localhost:3000/api/storage/receipts?filename=test.jpg'
    )

    const { GET } = await import('@/app/api/storage/[bucket]/route')
    const response = await GET(request, {
      params: Promise.resolve({ bucket: 'receipts' }),
    })

    expect(response.status).toBe(401)
  })

  it('returns 400 when filename is missing', async () => {
    mockGetSession.mockResolvedValue({
      user: { id: 'user-123', email: 'test@test.com' },
    })

    const request = new NextRequest('http://localhost:3000/api/storage/receipts')

    const { GET } = await import('@/app/api/storage/[bucket]/route')
    const response = await GET(request, {
      params: Promise.resolve({ bucket: 'receipts' }),
    })

    expect(response.status).toBe(400)
  })

  it('returns 403 for invalid bucket', async () => {
    mockGetSession.mockResolvedValue({
      user: { id: 'user-123', email: 'test@test.com' },
    })

    const request = new NextRequest(
      'http://localhost:3000/api/storage/invalid?filename=test.jpg'
    )

    const { GET } = await import('@/app/api/storage/[bucket]/route')
    const response = await GET(request, {
      params: Promise.resolve({ bucket: 'invalid' }),
    })

    expect(response.status).toBe(403)
  })
})
