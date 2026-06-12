import { createServiceClient } from '@/lib/supabase/service'
import { computeMoraMonths } from '@/lib/utils'

export async function createNotificationInternal(
  userId: string,
  title: string,
  message: string
): Promise<void> {
  const supabase = createServiceClient()
  const { error } = await supabase
    .from('notifications')
    .insert({
      user_id: userId,
      title,
      message,
      read: false,
    })
  if (error) {
    throw new Error(`createNotification failed: ${error.message}`)
  }
}

export async function logActivityInternal(
  category: 'solicitudes' | 'atletas' | 'pagos' | 'aptos_medicos',
  action: string,
  athleteName: string | null,
  athleteEmail: string | null,
  details: string | null
): Promise<void> {
  const supabase = createServiceClient()
  const { error } = await supabase
    .from('activity_logs')
    .insert({
      category,
      action,
      athlete_name: athleteName,
      athlete_email: athleteEmail,
      details,
    })
  if (error) {
    throw new Error(`logActivity failed: ${error.message}`)
  }
}

export async function checkUpcomingExpirations(): Promise<{
  notified30: number
  notified15: number
  notified7: number
  expired: number
}> {
  const supabase = createServiceClient()
  const now = new Date()

  const { data: active } = await supabase
    .from('athletes')
    .select('id, user_id, name, email, apto_medico_vencimiento')
    .eq('apto_medico_status', 'vigente')

  if (!active?.length) return { notified30: 0, notified15: 0, notified7: 0, expired: 0 }

  let notified30 = 0, notified15 = 0, notified7 = 0, expired = 0

  for (const a of active) {
    if (!a.apto_medico_vencimiento || !a.user_id) continue

    const expDate = new Date(a.apto_medico_vencimiento)
    const daysLeft = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    const expStr = expDate.toLocaleDateString('es-AR')

    try {
      if (daysLeft <= 0) {
        await supabase.from('athletes').update({ apto_medico_status: 'vencido' }).eq('id', a.id)
        await createNotificationInternal(a.user_id, 'Apto medico vencido', `Tu certificado vencio el ${expStr}. Subi uno nuevo.`)
        await logActivityInternal('aptos_medicos', 'vencido', a.name, a.email, `Vencio el ${expStr}`)
        expired++
      } else if (daysLeft <= 7) {
        await createNotificationInternal(a.user_id, 'Apto medico por vencer', `Tu certificado vence en ${daysLeft} dias (${expStr}).`)
        notified7++
      } else if (daysLeft <= 15) {
        await createNotificationInternal(a.user_id, 'Apto medico proximo a vencer', `Tu certificado vence el ${expStr}. Quedan ${daysLeft} dias.`)
        notified15++
      } else if (daysLeft <= 30) {
        await createNotificationInternal(a.user_id, 'Renova tu apto medico', `Tu certificado vence el ${expStr}. Renovalo con tiempo.`)
        notified30++
      }
    } catch (err) {
      console.error(`[cron] checkUpcomingExpirations athlete ${a.id}:`, err)
    }
  }

  return { notified30, notified15, notified7, expired }
}

type PaymentReminderType = 'pre_due_7d' | 'pre_due_3d' | 'due_today' | 'overdue_1d' | 'overdue_7d'

interface PaymentReminderDescriptor {
  type: PaymentReminderType
  matchDays: number
  title: string
  build: (dueDateStr: string) => string
}

const PAYMENT_REMINDERS: PaymentReminderDescriptor[] = [
  {
    type: 'pre_due_7d',
    matchDays: 7,
    title: 'Tu cuota vence pronto',
    build: (d) => `Tu cuota mensual vence el ${d}. Ya podes pagarla desde la app.`,
  },
  {
    type: 'pre_due_3d',
    matchDays: 3,
    title: 'Recordatorio de cuota',
    build: (d) => `Tu cuota vence en 3 dias (${d}). No te olvides de subir el comprobante.`,
  },
  {
    type: 'due_today',
    matchDays: 0,
    title: 'Tu cuota vence hoy',
    build: (d) => `Hoy vence tu cuota (${d}). Sube tu comprobante para no entrar en mora.`,
  },
  {
    type: 'overdue_1d',
    matchDays: -1,
    title: 'Cuota vencida',
    build: (d) => `Tu cuota vencio el ${d}. Regulariza tu pago para mantener tu lugar.`,
  },
  {
    type: 'overdue_7d',
    matchDays: -7,
    title: 'Cuota vencida hace 7 dias',
    build: (d) => `Tu cuota esta vencida desde el ${d}. Si no regularizas, podes perder el acceso a los entrenamientos.`,
  },
]

export async function checkUpcomingPaymentDues(): Promise<{
  preDue7: number
  preDue3: number
  dueToday: number
  overdue1: number
  overdue7: number
}> {
  const supabase = createServiceClient()
  const now = new Date()
  now.setHours(0, 0, 0, 0)

  const { data: candidates, error } = await supabase
    .from('athletes')
    .select('id, user_id, name, email, next_payment_due, mora_months')
    .eq('team_status', 'activo')
    .neq('payment_status', 'Pagado')
    .not('next_payment_due', 'is', null)

  if (error) {
    console.error('[cron] checkUpcomingPaymentDues query failed:', error)
    return { preDue7: 0, preDue3: 0, dueToday: 0, overdue1: 0, overdue7: 0 }
  }

  if (!candidates?.length) {
    return { preDue7: 0, preDue3: 0, dueToday: 0, overdue1: 0, overdue7: 0 }
  }

  const counts: Record<PaymentReminderType, number> = {
    pre_due_7d: 0,
    pre_due_3d: 0,
    due_today: 0,
    overdue_1d: 0,
    overdue_7d: 0,
  }

  for (const a of candidates) {
    if (!a.next_payment_due || !a.user_id) continue

    const due = new Date(a.next_payment_due)
    due.setHours(0, 0, 0, 0)
    const daysLeft = Math.round((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    const dueStr = due.toLocaleDateString('es-AR')

    if (daysLeft > 7) continue

    for (const r of PAYMENT_REMINDERS) {
      if (daysLeft !== r.matchDays) continue
      const sent = await trySendPaymentReminder(a.id, a.user_id, r.type, r.title, r.build(dueStr))
      if (sent) counts[r.type]++
      break
    }

    if (daysLeft < 0) {
      const mora = computeMoraMonths(Math.abs(daysLeft))
      const currentMora = a.mora_months ?? 0
      try {
        if (mora > currentMora) {
          await supabase
            .from('athletes')
            .update({ mora_months: mora, payment_status: 'Vencido' })
            .eq('id', a.id)
        } else if (currentMora === 0) {
          await supabase
            .from('athletes')
            .update({ payment_status: 'Vencido' })
            .eq('id', a.id)
        }
      } catch (err) {
        console.error(`[cron] checkUpcomingPaymentDues mora update for ${a.id}:`, err)
      }
    }
  }

  return {
    preDue7:  counts.pre_due_7d,
    preDue3:  counts.pre_due_3d,
    dueToday: counts.due_today,
    overdue1: counts.overdue_1d,
    overdue7: counts.overdue_7d,
  }
}

async function trySendPaymentReminder(
  athleteId: string,
  userId: string,
  type: PaymentReminderType,
  title: string,
  message: string,
): Promise<boolean> {
  const supabase = createServiceClient()
  const { error: logError } = await supabase
    .from('payment_reminder_log')
    .insert({ athlete_id: athleteId, reminder_type: type })

  if (logError) {
    if (logError.code === '23505') {
      return false
    }
    console.error('[cron] payment_reminder_log insert failed:', logError)
    return false
  }

  // Send the notification, but don't fail the cron if the notification
  // insert fails. The reminder log row is the source of truth for
  // idempotency; a failed notification just means the user won't see
  // this one (and we'll retry the whole batch tomorrow anyway).
  try {
    await createNotificationInternal(userId, title, message)
  } catch (notifErr) {
    console.error('[cron] createNotification failed after reminder log inserted:', notifErr)
  }
  return true
}
