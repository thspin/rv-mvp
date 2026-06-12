import { NextResponse } from 'next/server'
import { Pool } from 'pg'
import { loadEnv } from '@/lib/env'

loadEnv()

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

interface HealthResponse {
  status: 'ok' | 'degraded'
  timestamp: string
  uptime: number
  checks: {
    database: {
      status: 'up' | 'down'
      latencyMs: number | null
      error?: string
    }
  }
}

const startTime = Date.now()

export async function GET(): Promise<NextResponse<HealthResponse>> {
  const timestamp = new Date().toISOString()
  const uptime = Math.floor((Date.now() - startTime) / 1000)

  const dbUrl = (process.env.DATABASE_URL ?? '').replace(/[\r\n]/g, '').trim()
  const dbCheck: HealthResponse['checks']['database'] = {
    status: 'down',
    latencyMs: null,
  }

  if (!dbUrl) {
    dbCheck.error = 'DATABASE_URL is not set'
  } else {
    const pool = new Pool({
      connectionString: dbUrl,
      max: 1,
      connectionTimeoutMillis: 3000,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: true } : false,
    })
    const start = Date.now()
    try {
      const { rows } = await pool.query('SELECT 1 AS ok')
      dbCheck.latencyMs = Date.now() - start
      if (rows?.[0]?.ok === 1) {
        dbCheck.status = 'up'
      } else {
        dbCheck.error = 'unexpected response from SELECT 1'
      }
    } catch (err) {
      dbCheck.error = String(err)
    } finally {
      await pool.end().catch(() => {})
    }
  }

  const status: 'ok' | 'degraded' = dbCheck.status === 'up' ? 'ok' : 'degraded'
  const body: HealthResponse = {
    status,
    timestamp,
    uptime,
    checks: { database: dbCheck },
  }

  return NextResponse.json(body, {
    status: status === 'ok' ? 200 : 503,
    headers: {
      'Cache-Control': 'no-store',
    },
  })
}
