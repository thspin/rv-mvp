import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { Athlete } from '@/lib/db-types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function buildWhatsAppLink(phone: string, message: string): string {
  const cleanPhone = phone.replace(/[^0-9]/g, '')
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`
}

export function addMonthsWithClamp(date: Date, months: number): Date {
  const result = new Date(date)
  const targetMonth = result.getMonth() + months
  result.setMonth(targetMonth)
  if (result.getMonth() !== ((targetMonth % 12) + 12) % 12) {
    result.setDate(0)
  }
  return result
}

export function computeNextPaymentDue(fromDate: Date, dueDay: number): Date {
  const safeDay = Math.max(1, Math.min(28, Math.trunc(dueDay)))
  const result = new Date(fromDate.getFullYear(), fromDate.getMonth(), safeDay, 0, 0, 0, 0)
  if (result.getTime() <= fromDate.getTime()) {
    result.setMonth(result.getMonth() + 1)
  }
  if (result.getDate() !== safeDay) {
    result.setDate(0)
  }
  return result
}

export function formatCurrency(amount: number, currency: string = 'ARS'): string {
  const code = (currency || 'ARS').toUpperCase()
  try {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: code,
      maximumFractionDigits: 0,
    }).format(amount)
  } catch {
    return `$${amount.toLocaleString('es-AR')}`
  }
}

export function isProfileComplete(user: Athlete | null): boolean {
  if (!user) return false;
  const hasRequiredFields = !!(
    user.name?.trim() &&
    user.dni?.trim() &&
    user.phone?.trim() &&
    user.contacto_emergencia_name?.trim() &&
    user.contacto_emergencia_phone?.trim() &&
    user.talle_remera &&
    user.genero &&
    user.fecha_nacimiento &&
    user.pais?.trim() &&
    user.provincia?.trim() &&
    user.ciudad?.trim() &&
    user.codigo_postal?.trim() &&
    user.domicilio?.trim()
  );
  const hasRequiredDocs = !!(
    user.documento_url &&
    user.documento_status !== 'no_entregado' &&
    user.documento_status !== 'rechazado' &&
    user.apto_medico_url &&
    user.apto_medico_status !== 'no_entregado' &&
    user.apto_medico_status !== 'rechazado'
  );
  return hasRequiredFields && hasRequiredDocs && user.onboarding_complete;
}

export const MORA_MAX_MONTHS = 99

export function computeMoraMonths(daysOverdue: number): number {
  if (!Number.isFinite(daysOverdue) || daysOverdue <= 0) return 0
  return Math.min(MORA_MAX_MONTHS, Math.floor(daysOverdue / 30))
}

export function safeEmailForFilename(email: string | null | undefined): string {
  return (email || 'unknown').replace(/[@.]/g, '_')
}

/**
 * Reject uploads whose filename does not start with the safe version of
 * the session user's email. The /api/storage/upload route generates
 * filenames like `<safeEmail>_<timestamp>_<random>.ext`, so a filename
 * whose prefix is the caller's own email is the only one the caller
 * legitimately owns. This closes an IDOR: a user used to be able to
 * pass any athlete's email here and have their uploaded file linked to
 * the other athlete's record.
 *
 * Throws if the filename is not a string, contains path traversal, or
 * does not start with `<safeEmail>_`.
 */
export function assertFilenameOwnership(
  userEmail: string | null | undefined,
  filename: unknown,
  kind: 'receipt' | 'cert',
): asserts filename is string {
  if (typeof filename !== 'string' || filename.length === 0) {
    throw new Error(`Invalid ${kind} filename: must be a non-empty string`)
  }
  if (filename.includes('/') || filename.includes('\\') || filename.includes('..')) {
    throw new Error(`Invalid ${kind} filename: path traversal not allowed`)
  }
  const expectedPrefix = `${safeEmailForFilename(userEmail)}_`
  if (!filename.startsWith(expectedPrefix)) {
    throw new Error(`Forbidden: ${kind} filename does not match session user`)
  }
}

export function parseDateLocal(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function getExperienceYears(foundedDateStr?: string): number {
  if (!foundedDateStr) return 10;
  const founded = parseDateLocal(foundedDateStr);
  if (isNaN(founded.getTime())) return 10;
  const today = new Date();
  let years = today.getFullYear() - founded.getFullYear();
  const m = today.getMonth() - founded.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < founded.getDate())) {
    years--;
  }
  return Math.max(0, years);
}

export function calculateProfileCompletion(user: Athlete | null): number {
  if (!user) return 0;
  let points = 0;
  if (user.name?.trim()) points++;
  if (user.dni?.trim()) points++;
  if (user.phone?.trim()) points++;
  if (user.contacto_emergencia_name?.trim()) points++;
  if (user.contacto_emergencia_phone?.trim()) points++;
  if (user.talle_remera) points++;
  if (user.genero) points++;
  if (user.fecha_nacimiento) points++;
  if (user.pais?.trim()) points++;
  if (user.provincia?.trim()) points++;
  if (user.ciudad?.trim()) points++;
  if (user.codigo_postal?.trim()) points++;
  if (user.domicilio?.trim()) points++;
  if (user.documento_url && user.documento_status !== 'no_entregado' && user.documento_status !== 'rechazado') points++;
  if (user.apto_medico_url && user.apto_medico_status !== 'no_entregado' && user.apto_medico_status !== 'rechazado') points++;
  
  return Math.round((points / 15) * 100);
}
