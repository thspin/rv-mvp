import { z } from 'zod'

// Sanitize a free-text string. Trims, collapses whitespace, and caps
// the length. We do NOT strip HTML aggressively because the app
// renders user content as text via React (which escapes), so the
// only realistic XSS vector is if someone bypasses React rendering
// (e.g. dangerouslySetInnerHTML — the codebase does not use it).
export const shortText = (max: number = 200) =>
  z
    .string()
    .trim()
    .max(max, `must be at most ${max} characters`)
    .transform((v) => v.replace(/\s+/g, ' '))

export const longText = (max: number = 5000) =>
  z
    .string()
    .trim()
    .max(max, `must be at most ${max} characters`)

export const email = z
  .string()
  .trim()
  .toLowerCase()
  .email('invalid email')

export const nonNegativeInt = z
  .number()
  .int('must be an integer')
  .min(0, 'must be >= 0')

export const positiveInt = z
  .number()
  .int('must be an integer')
  .positive('must be > 0')

export const nonNegativeAmount = (max: number = 1_000_000_000) =>
  z
    .number()
    .finite('must be a finite number')
    .min(0, 'must be >= 0')
    .max(max, `must be <= ${max}`)

export const uuid = z.string().uuid('invalid id')

export const safeFilename = z
  .string()
  .min(1, 'must not be empty')
  .max(200, 'must be at most 200 characters')
  .regex(/^[A-Za-z0-9_@.-]+$/, 'invalid filename characters')

export const paymentMethod = z.enum([
  'Transferencia',
  'Efectivo',
  'MercadoPago',
  'Otro',
])

export const teamInstructionsInput = longText(10_000)
export const teamName = shortText(120)
export const teamCoach = shortText(120)
export const teamWhatsappUrl = z
  .string()
  .trim()
  .max(500, 'must be at most 500 characters')
  .refine(
    (v) => v === '' || /^https?:\/\/(wa\.me|api\.whatsapp\.com|chat\.whatsapp\.com)\//.test(v),
    'must be a WhatsApp URL or empty',
  )

export const rejectReason = shortText(500)

export const updateTeamInput = z
  .object({
    name: teamName.optional(),
    description: longText(2000).optional(),
    whatsapp_url: teamWhatsappUrl.optional(),
    training_days: longText(2000).optional(),
    coach: teamCoach.optional(),
    instructions: teamInstructionsInput.optional(),
    location: shortText(200).optional(),
    logo_url: z.string().trim().max(2000).optional().or(z.literal('')),
    founded_date: shortText(20).optional(),
    specialties: shortText(500).optional(),
    special_instructions: longText(2000).optional(),
    google_maps_url: z
      .string()
      .trim()
      .max(2000)
      .optional()
      .or(z.literal(''))
      .refine(
        (v) => !v || /^https?:\/\//.test(v),
        'must be a URL or empty',
      ),
    subscription_plans: longText(5000).optional(),
    bank_cbu: z
      .string()
      .trim()
      .max(50)
      .optional()
      .or(z.literal(''))
      .refine(
        (v) => !v || /^\d{6,30}$/.test(v),
        'must be a numeric CBU (6-30 digits)',
      ),
    bank_alias: z
      .string()
      .trim()
      .max(100)
      .optional()
      .or(z.literal(''))
      .refine(
        (v) => !v || /^[A-Za-z0-9.-]{3,30}$/.test(v),
        'must be 3-30 chars (letters, digits, ., -)',
      ),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, { message: 'no fields to update' })
