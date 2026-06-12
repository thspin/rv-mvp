import { describe, it, expect } from 'vitest'
import { fromDbAthlete, parseTrainingDays, parseInstructions } from '@/lib/db-types'

describe('fromDbAthlete', () => {
  it('maps a complete row correctly', () => {
    const row = {
      id: 'abc-123',
      user_id: 'user-456',
      email: 'test@test.com',
      name: 'Juan Perez',
      role: 'atleta',
      onboarding_complete: true,
      dni: '12345678',
      phone: '1234567890',
      talle_remera: 'M',
      contacto_emergencia_name: 'Maria',
      contacto_emergencia_phone: '0987654321',
      grupo_sanguineo: 'O+',
      alergias: 'Ninguna',
      afecciones: 'Ninguna',
      apto_medico_url: 'apto.jpg',
      apto_medico_status: 'vigente',
      apto_medico_vencimiento: '2025-12-31',
      apto_medico_motivo_rechazo: null,
      team_id: 'team-789',
      team_status: 'activo',
      payment_status: 'Pagado',
      payment_receipt_url: 'receipt.jpg',
      payment_method: 'Transferencia',
      payment_motivo_rechazo: null,
      genero: 'masculino',
      fecha_nacimiento: '1990-01-15',
      tipo_documento: 'DNI',
      pais: 'Argentina',
      provincia: 'Buenos Aires',
      ciudad: 'CABA',
      codigo_postal: '1414',
      domicilio: 'Av. Siempre Viva 742',
      documento_url: 'doc.jpg',
      documento_status: 'vigente',
      avatar_url: 'avatar.jpg',
      mora_months: 0,
      subscription_plan_id: 'plan-1',
    }

    const result = fromDbAthlete(row)

    expect(result.id).toBe('abc-123')
    expect(result.user_id).toBe('user-456')
    expect(result.email).toBe('test@test.com')
    expect(result.name).toBe('Juan Perez')
    expect(result.role).toBe('atleta')
    expect(result.onboarding_complete).toBe(true)
    expect(result.dni).toBe('12345678')
    expect(result.phone).toBe('1234567890')
    expect(result.talle_remera).toBe('M')
    expect(result.contacto_emergencia_name).toBe('Maria')
    expect(result.contacto_emergencia_phone).toBe('0987654321')
    expect(result.grupo_sanguineo).toBe('O+')
    expect(result.alergias).toBe('Ninguna')
    expect(result.afecciones).toBe('Ninguna')
    expect(result.apto_medico_url).toBe('apto.jpg')
    expect(result.apto_medico_status).toBe('vigente')
    expect(result.apto_medico_vencimiento).toBe('2025-12-31')
    expect(result.apto_medico_motivo_rechazo).toBeNull()
    expect(result.team_id).toBe('team-789')
    expect(result.team_status).toBe('activo')
    expect(result.payment_status).toBe('Pagado')
    expect(result.payment_receipt_url).toBe('receipt.jpg')
    expect(result.payment_method).toBe('Transferencia')
    expect(result.payment_motivo_rechazo).toBeNull()
    expect(result.genero).toBe('masculino')
    expect(result.fecha_nacimiento).toBe('1990-01-15')
    expect(result.tipo_documento).toBe('DNI')
    expect(result.pais).toBe('Argentina')
    expect(result.provincia).toBe('Buenos Aires')
    expect(result.ciudad).toBe('CABA')
    expect(result.codigo_postal).toBe('1414')
    expect(result.domicilio).toBe('Av. Siempre Viva 742')
    expect(result.documento_url).toBe('doc.jpg')
    expect(result.documento_status).toBe('vigente')
    expect(result.avatar_url).toBe('avatar.jpg')
    expect(result.mora_months).toBe(0)
    expect(result.subscription_plan_id).toBe('plan-1')
  })

  it('handles null/undefined fields with defaults', () => {
    const row = {
      email: 'test@test.com',
      name: 'Juan',
      role: null,
      onboarding_complete: false,
    }

    const result = fromDbAthlete(row)

    expect(result.id).toBeUndefined()
    expect(result.user_id).toBeUndefined()
    expect(result.email).toBe('test@test.com')
    expect(result.name).toBe('Juan')
    expect(result.role).toBeNull()
    expect(result.onboarding_complete).toBe(false)
    expect(result.mora_months).toBe(0)
  })

  it('converts falsy onboarding_complete to false', () => {
    const result1 = fromDbAthlete({ email: 'a@b.com', name: 'A', role: null, onboarding_complete: false })
    expect(result1.onboarding_complete).toBe(false)

    const result2 = fromDbAthlete({ email: 'a@b.com', name: 'A', role: null, onboarding_complete: 0 })
    expect(result2.onboarding_complete).toBe(false)

    const result3 = fromDbAthlete({ email: 'a@b.com', name: 'A', role: null, onboarding_complete: null })
    expect(result3.onboarding_complete).toBe(false)
  })

  it('converts truthy onboarding_complete to true', () => {
    const result1 = fromDbAthlete({ email: 'a@b.com', name: 'A', role: null, onboarding_complete: true })
    expect(result1.onboarding_complete).toBe(true)

    const result2 = fromDbAthlete({ email: 'a@b.com', name: 'A', role: null, onboarding_complete: 1 })
    expect(result2.onboarding_complete).toBe(true)
  })

  it('defaults mora_months to 0 when null/undefined', () => {
    const result1 = fromDbAthlete({ email: 'a@b.com', name: 'A', role: null, onboarding_complete: false, mora_months: null })
    expect(result1.mora_months).toBe(0)

    const result2 = fromDbAthlete({ email: 'a@b.com', name: 'A', role: null, onboarding_complete: false, mora_months: undefined })
    expect(result2.mora_months).toBe(0)
  })

  it('preserves mora_months when it has a value', () => {
    const result = fromDbAthlete({ email: 'a@b.com', name: 'A', role: null, onboarding_complete: false, mora_months: 3 })
    expect(result.mora_months).toBe(3)
  })
})

describe('parseTrainingDays', () => {
  it('returns null for null input', () => {
    expect(parseTrainingDays(null)).toBeNull()
  })

  it('returns null for undefined input', () => {
    expect(parseTrainingDays(undefined)).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(parseTrainingDays('')).toBeNull()
  })

  it('parses valid JSON array of training shifts', () => {
    const input = JSON.stringify([
      { id: '1', name: 'Lunes', days: 'Lun', time: '18:00', location: 'Cancha 1' },
      { id: '2', name: 'Miercoles', days: 'Mie', time: '18:00', location: 'Cancha 1' },
    ])
    const result = parseTrainingDays(input)
    expect(result).toHaveLength(2)
    expect(result![0].id).toBe('1')
    expect(result![0].name).toBe('Lunes')
    expect(result![1].id).toBe('2')
  })

  it('returns null for invalid JSON', () => {
    expect(parseTrainingDays('not json')).toBeNull()
  })

  it('returns null for JSON that is not an array', () => {
    expect(parseTrainingDays('{"key": "value"}')).toBeNull()
  })

  it('returns null for array with items missing required fields', () => {
    const input = JSON.stringify([{ name: 'Lunes' }])
    expect(parseTrainingDays(input)).toBeNull()
  })

  it('returns null for array with non-object items', () => {
    const input = JSON.stringify(['string', 123])
    expect(parseTrainingDays(input)).toBeNull()
  })
})

describe('parseInstructions', () => {
  it('returns null for null input', () => {
    expect(parseInstructions(null)).toBeNull()
  })

  it('returns null for undefined input', () => {
    expect(parseInstructions(undefined)).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(parseInstructions('')).toBeNull()
  })

  it('parses valid JSON with shifts', () => {
    const input = JSON.stringify({
      general: 'Instrucciones generales',
      shifts: {
        '1': 'Instrucciones para shift 1',
        '2': 'Instrucciones para shift 2',
      },
    })
    const result = parseInstructions(input)
    expect(result).not.toBeNull()
    expect(result!.general).toBe('Instrucciones generales')
    expect(result!.shifts).toHaveProperty('1')
    expect(result!.shifts).toHaveProperty('2')
  })

  it('parses valid JSON with only shifts (no general)', () => {
    const input = JSON.stringify({
      shifts: { '1': 'Instrucciones' },
    })
    const result = parseInstructions(input)
    expect(result).not.toBeNull()
    expect(result!.shifts).toHaveProperty('1')
    expect(result!.general).toBeUndefined()
  })

  it('returns null for invalid JSON', () => {
    expect(parseInstructions('not json')).toBeNull()
  })

  it('returns null for JSON without shifts property', () => {
    expect(parseInstructions('{"general": "test"}')).toBeNull()
  })

  it('returns null for non-object JSON', () => {
    expect(parseInstructions('"string"')).toBeNull()
    expect(parseInstructions('123')).toBeNull()
    expect(parseInstructions('[]')).toBeNull()
  })
})
