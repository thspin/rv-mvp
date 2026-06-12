'use server'

import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { createAuthenticatedClient } from '@/lib/supabase/authenticated'
import { createServiceClient } from '@/lib/supabase/service'
import {
  PRICING_DEFAULTS,
  SUPPORTED_CURRENCIES,
  type PricingConfig,
  type SupportedCurrency,
} from '@/lib/db-types'

function clampDueDay(value: unknown): number {
  const n = Number(value)
  if (!Number.isFinite(n)) return PRICING_DEFAULTS.dueDay
  return Math.max(1, Math.min(28, Math.trunc(n)))
}

function clampAmount(value: unknown): number {
  const n = Number(value)
  if (!Number.isFinite(n) || n < 0) return PRICING_DEFAULTS.amount
  return Math.round(n * 100) / 100
}

function coerceCurrency(value: unknown): SupportedCurrency {
  if (typeof value === 'string' && (SUPPORTED_CURRENCIES as readonly string[]).includes(value)) {
    return value as SupportedCurrency
  }
  return PRICING_DEFAULTS.currency
}

function coerceValue<T>(raw: unknown, coerce: (v: unknown) => T, fallback: T): T {
  if (raw === null || raw === undefined) return fallback
  return coerce(raw)
}

export async function getPricingConfig(): Promise<PricingConfig> {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user?.email) {
      return PRICING_DEFAULTS
    }
    const supabase = createAuthenticatedClient(session.user.id)
    const { data, error } = await supabase.from('site_settings').select('key, value')
    if (error) throw error
    const rows = Array.isArray(data) ? data : []
    const map = new Map<string, unknown>()
    for (const row of rows) {
      if (row && typeof row === 'object' && 'key' in row) {
        map.set((row as { key: unknown }).key as string, (row as { value: unknown }).value)
      }
    }
    return {
      amount:  coerceValue(map.get('monthly_fee'),     clampAmount,    PRICING_DEFAULTS.amount),
      currency: coerceValue(map.get('currency'),       coerceCurrency, PRICING_DEFAULTS.currency),
      dueDay:  coerceValue(map.get('payment_due_day'), clampDueDay,    PRICING_DEFAULTS.dueDay),
    }
  } catch (err) {
    console.error('[settings] getPricingConfig fallback to defaults:', err)
    return PRICING_DEFAULTS
  }
}

export async function updatePricingConfig(updates: {
  amount?: number
  currency?: SupportedCurrency
  dueDay?: number
}): Promise<PricingConfig> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.email) {
    throw new Error('Unauthorized: No active session')
  }

  const supabase = createAuthenticatedClient(session.user.id)
  const { data: athlete } = await supabase
    .from('athletes')
    .select('role')
    .eq('user_id', session.user.id)
    .maybeSingle()

  if (!athlete || athlete.role !== 'admin') {
    throw new Error('Forbidden: Admin access required')
  }

  const rows: Array<{ key: string; value: unknown }> = []
  if (updates.amount !== undefined)  rows.push({ key: 'monthly_fee',     value: clampAmount(updates.amount) })
  if (updates.currency !== undefined) rows.push({ key: 'currency',      value: updates.currency })
  if (updates.dueDay !== undefined)   rows.push({ key: 'payment_due_day', value: clampDueDay(updates.dueDay) })

  if (rows.length === 0) {
    return getPricingConfig()
  }

  const now = new Date().toISOString()
  const { error } = await supabase
    .from('site_settings')
    .upsert(
      rows.map((r) => ({ key: r.key, value: r.value, updated_at: now, updated_by: session.user.id })),
      { onConflict: 'key' },
    )
  if (error) throw error

  return getPricingConfig()
}

export async function getPricingConfigUnauthenticated(): Promise<PricingConfig> {
  try {
    const supabase = createServiceClient()
    const { data, error } = await supabase.from('site_settings').select('key, value')
    if (error) throw error
    const rows = Array.isArray(data) ? data : []
    const map = new Map<string, unknown>()
    for (const row of rows) {
      if (row && typeof row === 'object' && 'key' in row) {
        map.set((row as { key: unknown }).key as string, (row as { value: unknown }).value)
      }
    }
    return {
      amount:  coerceValue(map.get('monthly_fee'),     clampAmount,    PRICING_DEFAULTS.amount),
      currency: coerceValue(map.get('currency'),       coerceCurrency, PRICING_DEFAULTS.currency),
      dueDay:  coerceValue(map.get('payment_due_day'), clampDueDay,    PRICING_DEFAULTS.dueDay),
    }
  } catch (err) {
    console.error('[settings] getPricingConfigUnauthenticated fallback:', err)
    return PRICING_DEFAULTS
  }
}
