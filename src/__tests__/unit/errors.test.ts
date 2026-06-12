import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { RateLimitError } from '@/lib/errors'

describe('RateLimitError', () => {
  it('uses default message when none provided', () => {
    const err = new RateLimitError()
    expect(err.message).toBe('Demasiadas solicitudes. Intenta de nuevo en unos segundos.')
    expect(err.name).toBe('RateLimitError')
    expect(err.code).toBe('RATE_LIMITED')
  })

  it('accepts a custom message', () => {
    const err = new RateLimitError('Espera 30 segundos')
    expect(err.message).toBe('Espera 30 segundos')
  })

  it('stores retryAfter when provided', () => {
    const err = new RateLimitError('msg', 30)
    expect(err.retryAfter).toBe(30)
  })

  it('is instanceof Error', () => {
    const err = new RateLimitError()
    expect(err).toBeInstanceOf(Error)
    expect(err).toBeInstanceOf(RateLimitError)
  })
})
