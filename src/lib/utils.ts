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
