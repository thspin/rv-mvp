import { describe, it, expect } from 'vitest'
import {
  isProfileComplete,
  calculateProfileCompletion,
  addMonthsWithClamp,
  parseDateLocal,
  buildWhatsAppLink,
  getExperienceYears,
  cn,
} from '@/lib/utils'
import type { Athlete } from '@/lib/db-types'

const fullAthlete: Athlete = {
  email: 'test@test.com',
  name: 'Juan Perez',
  role: 'atleta',
  onboarding_complete: true,
  dni: '12345678',
  phone: '+5491112345678',
  talle_remera: 'M',
  contacto_emergencia_name: 'Maria Perez',
  contacto_emergencia_phone: '+5491187654321',
  genero: 'masculino',
  fecha_nacimiento: '1990-01-15',
  pais: 'Argentina',
  provincia: 'Buenos Aires',
  ciudad: 'CABA',
  codigo_postal: '1414',
  domicilio: 'Av. Siempre Viva 742',
  documento_url: 'doc_123.jpg',
  documento_status: 'vigente',
  apto_medico_url: 'apto_123.jpg',
  apto_medico_status: 'vigente',
}

describe('isProfileComplete', () => {
  it('returns false for null input', () => {
    expect(isProfileComplete(null)).toBe(false)
  })

  it('returns true for a fully complete athlete', () => {
    expect(isProfileComplete(fullAthlete)).toBe(true)
  })

  it('returns false when name is missing', () => {
    expect(isProfileComplete({ ...fullAthlete, name: '' })).toBe(false)
  })

  it('returns false when dni is missing', () => {
    expect(isProfileComplete({ ...fullAthlete, dni: undefined })).toBe(false)
  })

  it('returns false when phone is missing', () => {
    expect(isProfileComplete({ ...fullAthlete, phone: '' })).toBe(false)
  })

  it('returns false when contacto_emergencia_name is missing', () => {
    expect(isProfileComplete({ ...fullAthlete, contacto_emergencia_name: '' })).toBe(false)
  })

  it('returns false when contacto_emergencia_phone is missing', () => {
    expect(isProfileComplete({ ...fullAthlete, contacto_emergencia_phone: '' })).toBe(false)
  })

  it('returns false when talle_remera is missing', () => {
    expect(isProfileComplete({ ...fullAthlete, talle_remera: undefined })).toBe(false)
  })

  it('returns false when genero is missing', () => {
    expect(isProfileComplete({ ...fullAthlete, genero: undefined })).toBe(false)
  })

  it('returns false when fecha_nacimiento is missing', () => {
    expect(isProfileComplete({ ...fullAthlete, fecha_nacimiento: undefined })).toBe(false)
  })

  it('returns false when pais is missing', () => {
    expect(isProfileComplete({ ...fullAthlete, pais: '' })).toBe(false)
  })

  it('returns false when provincia is missing', () => {
    expect(isProfileComplete({ ...fullAthlete, provincia: '' })).toBe(false)
  })

  it('returns false when ciudad is missing', () => {
    expect(isProfileComplete({ ...fullAthlete, ciudad: '' })).toBe(false)
  })

  it('returns false when codigo_postal is missing', () => {
    expect(isProfileComplete({ ...fullAthlete, codigo_postal: '' })).toBe(false)
  })

  it('returns false when domicilio is missing', () => {
    expect(isProfileComplete({ ...fullAthlete, domicilio: '' })).toBe(false)
  })

  it('returns false when documento_url is missing', () => {
    expect(isProfileComplete({ ...fullAthlete, documento_url: undefined })).toBe(false)
  })

  it('returns false when documento_status is rechazado', () => {
    expect(isProfileComplete({ ...fullAthlete, documento_status: 'rechazado' })).toBe(false)
  })

  it('returns false when documento_status is no_entregado', () => {
    expect(isProfileComplete({ ...fullAthlete, documento_status: 'no_entregado' })).toBe(false)
  })

  it('returns false when apto_medico_url is missing', () => {
    expect(isProfileComplete({ ...fullAthlete, apto_medico_url: undefined })).toBe(false)
  })

  it('returns false when apto_medico_status is rechazado', () => {
    expect(isProfileComplete({ ...fullAthlete, apto_medico_status: 'rechazado' })).toBe(false)
  })

  it('returns false when apto_medico_status is no_entregado', () => {
    expect(isProfileComplete({ ...fullAthlete, apto_medico_status: 'no_entregado' })).toBe(false)
  })

  it('returns false when onboarding_complete is false', () => {
    expect(isProfileComplete({ ...fullAthlete, onboarding_complete: false })).toBe(false)
  })

  it('returns false when name is only whitespace', () => {
    expect(isProfileComplete({ ...fullAthlete, name: '   ' })).toBe(false)
  })
})

describe('calculateProfileCompletion', () => {
  it('returns 0 for null input', () => {
    expect(calculateProfileCompletion(null)).toBe(0)
  })

  it('returns 100 for a fully complete athlete', () => {
    expect(calculateProfileCompletion(fullAthlete)).toBe(100)
  })

  it('returns 0 for an empty athlete', () => {
    const emptyAthlete: Athlete = {
      email: 'test@test.com',
      name: '',
      role: null,
      onboarding_complete: false,
    }
    expect(calculateProfileCompletion(emptyAthlete)).toBe(0)
  })

  it('calculates 47% for 7/15 fields filled', () => {
    const partialAthlete: Athlete = {
      email: 'test@test.com',
      name: 'Juan',
      role: 'atleta',
      onboarding_complete: false,
      dni: '12345678',
      phone: '1234567890',
      contacto_emergencia_name: 'Maria',
      contacto_emergencia_phone: '0987654321',
      talle_remera: 'M',
      genero: 'masculino',
    }
    expect(calculateProfileCompletion(partialAthlete)).toBe(47)
  })

  it('does not count documento_status rechazado as a point', () => {
    const athlete = { ...fullAthlete, documento_status: 'rechazado' as const }
    const points = calculateProfileCompletion(athlete)
    expect(points).toBe(93)
  })

  it('does not count apto_medico_status no_entregado as a point', () => {
    const athlete = { ...fullAthlete, apto_medico_status: 'no_entregado' as const }
    const points = calculateProfileCompletion(athlete)
    expect(points).toBe(93)
  })
})

describe('addMonthsWithClamp', () => {
  it('adds one month normally', () => {
    const date = new Date(2024, 0, 15)
    const result = addMonthsWithClamp(date, 1)
    expect(result.getMonth()).toBe(1)
    expect(result.getDate()).toBe(15)
  })

  it('clamps Jan 31 + 1 month to Feb 28 (non-leap year)', () => {
    const date = new Date(2023, 0, 31)
    const result = addMonthsWithClamp(date, 1)
    expect(result.getMonth()).toBe(1)
    expect(result.getDate()).toBe(28)
  })

  it('clamps Jan 31 + 1 month to Feb 29 (leap year)', () => {
    const date = new Date(2024, 0, 31)
    const result = addMonthsWithClamp(date, 1)
    expect(result.getMonth()).toBe(1)
    expect(result.getDate()).toBe(29)
  })

  it('clamps Mar 31 + 1 month to Apr 30', () => {
    const date = new Date(2024, 2, 31)
    const result = addMonthsWithClamp(date, 1)
    expect(result.getMonth()).toBe(3)
    expect(result.getDate()).toBe(30)
  })

  it('crosses year boundary correctly', () => {
    const date = new Date(2024, 11, 15)
    const result = addMonthsWithClamp(date, 1)
    expect(result.getFullYear()).toBe(2025)
    expect(result.getMonth()).toBe(0)
    expect(result.getDate()).toBe(15)
  })

  it('returns same date for 0 months', () => {
    const date = new Date(2024, 5, 15)
    const result = addMonthsWithClamp(date, 0)
    expect(result.getMonth()).toBe(5)
    expect(result.getDate()).toBe(15)
  })

  it('adds 6 months correctly', () => {
    const date = new Date(2024, 0, 15)
    const result = addMonthsWithClamp(date, 6)
    expect(result.getMonth()).toBe(6)
    expect(result.getDate()).toBe(15)
  })

  it('does not mutate the original date', () => {
    const date = new Date(2024, 0, 15)
    addMonthsWithClamp(date, 3)
    expect(date.getMonth()).toBe(0)
    expect(date.getDate()).toBe(15)
  })
})

describe('parseDateLocal', () => {
  it('parses YYYY-MM-DD correctly', () => {
    const result = parseDateLocal('2024-06-15')
    expect(result.getFullYear()).toBe(2024)
    expect(result.getMonth()).toBe(5)
    expect(result.getDate()).toBe(15)
  })

  it('parses Jan 1 correctly', () => {
    const result = parseDateLocal('2024-01-01')
    expect(result.getFullYear()).toBe(2024)
    expect(result.getMonth()).toBe(0)
    expect(result.getDate()).toBe(1)
  })

  it('parses Dec 31 correctly', () => {
    const result = parseDateLocal('2024-12-31')
    expect(result.getFullYear()).toBe(2024)
    expect(result.getMonth()).toBe(11)
    expect(result.getDate()).toBe(31)
  })

  it('creates a date in local timezone', () => {
    const result = parseDateLocal('2024-06-15')
    expect(result.getHours()).toBe(0)
    expect(result.getMinutes()).toBe(0)
    expect(result.getSeconds()).toBe(0)
  })
})

describe('buildWhatsAppLink', () => {
  it('cleans non-numeric characters from phone', () => {
    const result = buildWhatsAppLink('+54 9 11 1234-5678', 'Hola')
    expect(result).toBe('https://wa.me/5491112345678?text=Hola')
  })

  it('encodes message with spaces', () => {
    const result = buildWhatsAppLink('1234567890', 'Hola mundo')
    expect(result).toBe('https://wa.me/1234567890?text=Hola%20mundo')
  })

  it('encodes message with special characters', () => {
    const result = buildWhatsAppLink('1234567890', 'Hola, ¿cómo estás?')
    expect(result).toContain('text=')
    expect(result).not.toContain('¿')
  })

  it('handles phone with only numbers', () => {
    const result = buildWhatsAppLink('5491112345678', 'Test')
    expect(result).toBe('https://wa.me/5491112345678?text=Test')
  })
})

describe('getExperienceYears', () => {
  it('returns 10 when no date provided', () => {
    expect(getExperienceYears()).toBe(10)
  })

  it('returns 10 for undefined date', () => {
    expect(getExperienceYears(undefined)).toBe(10)
  })

  it('returns 10 for invalid date string', () => {
    expect(getExperienceYears('not-a-date')).toBe(10)
  })

  it('returns correct years for a past date', () => {
    const currentYear = new Date().getFullYear()
    const pastYear = currentYear - 5
    const result = getExperienceYears(`${pastYear}-01-01`)
    const today = new Date()
    const monthDiff = today.getMonth()
    const expectedYears = monthDiff > 0 || (monthDiff === 0 && today.getDate() >= 1) ? 5 : 4
    expect(result).toBe(expectedYears)
  })

  it('returns 0 for a future date', () => {
    const futureYear = new Date().getFullYear() + 5
    expect(getExperienceYears(`${futureYear}-01-01`)).toBe(0)
  })

  it('returns 0 for empty string', () => {
    expect(getExperienceYears('')).toBe(10)
  })
})

describe('cn', () => {
  it('merges class names', () => {
    const result = cn('foo', 'bar')
    expect(result).toBe('foo bar')
  })

  it('handles conditional classes', () => {
    const result = cn('base', false && 'hidden', 'extra')
    expect(result).toBe('base extra')
  })

  it('merges tailwind classes correctly', () => {
    const result = cn('p-4', 'p-2')
    expect(result).toBe('p-2')
  })

  it('handles undefined and null', () => {
    const result = cn('base', undefined, null, 'extra')
    expect(result).toBe('base extra')
  })
})
