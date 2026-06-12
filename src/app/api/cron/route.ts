import { NextResponse } from 'next/server'
import { checkUpcomingExpirations } from '@/lib/db'
import { createBackup, cleanOldBackups } from '@/lib/backup'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const notifications = await checkUpcomingExpirations()

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
