import { describe, it, expect } from 'vitest'
import { ok, fail, type MutationResult } from '@/lib/db-types'

describe('MutationResult helpers', () => {
  it('ok() returns a success result', () => {
    const r = ok()
    expect(r.success).toBe(true)
  })

  it('fail(error) returns a failure with the error message', () => {
    const r = fail('something broke')
    expect(r.success).toBe(false)
    if (!r.success) {
      expect(r.error).toBe('something broke')
      expect(r.code).toBeUndefined()
    }
  })

  it('fail(error, code) attaches the code', () => {
    const r = fail('duplicate', 'DUPLICATE')
    expect(r.success).toBe(false)
    if (!r.success) {
      expect(r.error).toBe('duplicate')
      expect(r.code).toBe('DUPLICATE')
    }
  })

  it('narrowing: success results have no error/code, failure results have both optional', () => {
    const a: MutationResult = ok()
    const b: MutationResult = fail('oops', 'DB_ERROR')
    if (a.success) {
      // type-level: a has no error
      expect(a).toEqual({ success: true })
    } else {
      // dead branch, but proves the union is exhaustive
      expect(a.error).toBeDefined()
    }
    if (!b.success) {
      expect(b.error).toBe('oops')
      expect(b.code).toBe('DB_ERROR')
    }
  })
})
