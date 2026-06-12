import { NextResponse } from 'next/server'
import { checkUpcomingExpirations, checkUpcomingPaymentDues } from '@/lib/db-internal'
import { createBackup, cleanOldBackups } from '@/lib/backup'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  const expectedSecret = process.env.CRON_SECRET

  if (!expectedSecret) {
    return NextResponse.json(
      { error: 'CRON_SECRET is not configured' },
      { status: 401 },
    )
  }

  if (authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const [notifications, paymentReminders] = await Promise.all([
      checkUpcomingExpirations(),
      checkUpcomingPaymentDues(),
    ])

    let backup: Awaited<ReturnType<typeof createBackup>> | null = null
    let limpieza: Awaited<ReturnType<typeof cleanOldBackups>> | null = null
    let backupError: string | null = null

    try {
      backup = await createBackup()
      limpieza = await cleanOldBackups()
    } catch (err) {
      backupError = String(err)
      console.error('[Cron] Backup falló:', err)
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      notifications,
      paymentReminders,
      backup: backup ?? { error: backupError },
      limpieza: limpieza ?? { eliminados: 0 },
    })
  } catch (error) {
    console.error('Cron job error:', error)
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 },
    )
  }
}
