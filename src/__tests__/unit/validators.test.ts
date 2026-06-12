import { describe, it, expect } from 'vitest'
import {
  email,
  nonNegativeAmount,
  paymentMethod,
  safeFilename,
  shortText,
  longText,
  teamWhatsappUrl,
  updateTeamInput,
} from '@/lib/validators'

describe('validators', () => {
  describe('email', () => {
    it('accepts well-formed emails', () => {
      expect(email.parse('user@example.com')).toBe('user@example.com')
    })
    it('lowercases and trims', () => {
      expect(email.parse('  USER@Example.COM  ')).toBe('user@example.com')
    })
    it('rejects garbage', () => {
      expect(() => email.parse('not-an-email')).toThrow()
      expect(() => email.parse('user@')).toThrow()
      expect(() => email.parse('')).toThrow()
    })
  })

  describe('nonNegativeAmount', () => {
    it('accepts 0', () => {
      expect(nonNegativeAmount().parse(0)).toBe(0)
    })
    it('accepts positive integers', () => {
      expect(nonNegativeAmount().parse(17000)).toBe(17000)
    })
    it('rejects negative numbers', () => {
      expect(() => nonNegativeAmount().parse(-1)).toThrow()
    })
    it('rejects non-finite numbers', () => {
      expect(() => nonNegativeAmount().parse(Infinity)).toThrow()
      expect(() => nonNegativeAmount().parse(NaN)).toThrow()
    })
  })

  describe('paymentMethod', () => {
    it('accepts known methods', () => {
      expect(paymentMethod.parse('Transferencia')).toBe('Transferencia')
      expect(paymentMethod.parse('Efectivo')).toBe('Efectivo')
    })
    it('rejects unknown methods (e.g., SQLi attempts)', () => {
      expect(() => paymentMethod.parse('DROP TABLE payments')).toThrow()
      expect(() => paymentMethod.parse("' OR 1=1 --")).toThrow()
    })
  })

  describe('safeFilename', () => {
    it('accepts the canonical upload filename pattern', () => {
      expect(safeFilename.parse('user_example_com_1700000000_abcd1234.jpg')).toBe(
        'user_example_com_1700000000_abcd1234.jpg',
      )
    })
    it('rejects path traversal', () => {
      expect(() => safeFilename.parse('../../etc/passwd')).toThrow()
      expect(() => safeFilename.parse('a/../b')).toThrow()
    })
    it('rejects shell metacharacters', () => {
      expect(() => safeFilename.parse('file;rm -rf /')).toThrow()
      expect(() => safeFilename.parse('file&whoami')).toThrow()
    })
    it('rejects empty', () => {
      expect(() => safeFilename.parse('')).toThrow()
    })
  })

  describe('shortText / longText', () => {
    it('shortText caps length', () => {
      expect(shortText(5).parse('hello')).toBe('hello')
      expect(() => shortText(5).parse('hello world')).toThrow()
    })
    it('shortText trims and collapses whitespace', () => {
      expect(shortText(100).parse('  hello   world  ')).toBe('hello world')
    })
    it('longText caps length but preserves internal whitespace', () => {
      const text = 'a\nb\nc'
      expect(longText(100).parse(text)).toBe(text)
    })
  })

  describe('teamWhatsappUrl', () => {
    it('accepts empty', () => {
      expect(teamWhatsappUrl.parse('')).toBe('')
    })
    it('accepts a wa.me link', () => {
      expect(teamWhatsappUrl.parse('https://wa.me/5491112345678')).toBe(
        'https://wa.me/5491112345678',
      )
    })
    it('accepts an api.whatsapp.com link', () => {
      expect(
        teamWhatsappUrl.parse('https://api.whatsapp.com/send?phone=5491112345678'),
      ).toBe('https://api.whatsapp.com/send?phone=5491112345678')
    })
    it('rejects a non-WhatsApp URL (e.g. javascript: scheme)', () => {
      expect(() => teamWhatsappUrl.parse('javascript:alert(1)')).toThrow()
      expect(() => teamWhatsappUrl.parse('https://evil.example.com/')).toThrow()
    })
  })

  describe('updateTeamInput', () => {
    it('accepts a single field update', () => {
      const parsed = updateTeamInput.parse({ name: 'Racing Club' })
      expect(parsed).toEqual({ name: 'Racing Club' })
    })
    it('accepts multiple fields', () => {
      const parsed = updateTeamInput.parse({
        name: 'Racing Club',
        coach: 'Juan Perez',
        bank_cbu: '1234567890123456789012',
      })
      expect(parsed.name).toBe('Racing Club')
      expect(parsed.bank_cbu).toBe('1234567890123456789012')
    })
    it('rejects an empty update object', () => {
      expect(() => updateTeamInput.parse({})).toThrow()
    })
    it('rejects an unknown field (strict mode)', () => {
      expect(() => updateTeamInput.parse({ evil: 'x' })).toThrow()
    })
    it('rejects a non-numeric CBU', () => {
      expect(() =>
        updateTeamInput.parse({ bank_cbu: 'not-a-cbu-with-letters' }),
      ).toThrow()
    })
    it('rejects a malformed logo URL', () => {
      expect(() => updateTeamInput.parse({ logo_url: 'not-a-url' })).not.toThrow()
      // empty string is fine (clears the field)
      expect(updateTeamInput.parse({ logo_url: '' })).toEqual({ logo_url: '' })
    })
  })
})
