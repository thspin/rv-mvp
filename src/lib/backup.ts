import { Pool } from 'pg'
import { gzipSync } from 'zlib'
import * as Sentry from '@sentry/nextjs'
import { createServiceClient } from '@/lib/supabase/service'

const TABLAS = [
  'user',
  'account',
  'session',
  'verification',
  'teams',
  'athletes',
  'payments',
  'notifications',
]

const BUCKET = 'backups'
const RETENCION_DIAS = 7

interface MetadataBackup {
  timestamp: string
  version: string
  totalFilas: number
  tablas: Record<string, number>
  duracionMs: number
  tamanoBytes: number
}

interface ResultadoBackup {
  success: boolean
  nombreArchivo: string
  totalFilas: number
  tablas: Record<string, number>
  tamanoBytes: number
  duracionMs: number
}

export async function createBackup(): Promise<ResultadoBackup> {
  const inicio = Date.now()
  const dbUrl = process.env.DATABASE_URL?.replace(/[\r\n]/g, '').trim()

  if (!dbUrl) {
    throw new Error('DATABASE_URL no configurada')
  }

  const pool = new Pool({ connectionString: dbUrl, max: 5 })

  try {
    const resultados = await Promise.all(
      TABLAS.map(async (tabla) => {
        const { rows } = await pool.query(
          `SELECT COALESCE(json_agg(t), '[]'::json) AS data FROM "${tabla}" t`,
        )
        return { tabla, data: rows[0].data }
      }),
    )

    const datos: Record<string, unknown[]> = {}
    const tablasConteo: Record<string, number> = {}
    let totalFilas = 0

    for (const { tabla, data } of resultados) {
      datos[tabla] = data
      tablasConteo[tabla] = data.length
      totalFilas += data.length
    }

    const metadata: MetadataBackup = {
      timestamp: new Date().toISOString(),
      version: '1.0',
      totalFilas,
      tablas: tablasConteo,
      duracionMs: Date.now() - inicio,
      tamanoBytes: 0,
    }

    const backupJson = JSON.stringify({ metadata, datos })
    const tamanoOriginal = Buffer.byteLength(backupJson)
    const backupGzip = gzipSync(backupJson)
    metadata.tamanoBytes = backupGzip.length

    const fecha = new Date().toISOString().split('T')[0]
    const nombreArchivo = `backup-${fecha}.json.gz`

    const supabase = createServiceClient()
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(nombreArchivo, backupGzip, {
        contentType: 'application/gzip',
        upsert: true,
      })

    if (uploadError) {
      throw new Error(`Error subiendo a Storage: ${uploadError.message}`)
    }

    const duracionMs = Date.now() - inicio

    console.log(
      `[Backup] OK: ${nombreArchivo} | ${totalFilas} filas | ${tamanoOriginal}B -> ${backupGzip.length}B gzip | ${duracionMs}ms`,
    )

    return {
      success: true,
      nombreArchivo,
      totalFilas,
      tablas: tablasConteo,
      tamanoBytes: backupGzip.length,
      duracionMs,
    }
  } catch (error) {
    Sentry.captureException(error, {
      tags: { source: 'backup-cron' },
    })
    throw error
  } finally {
    await pool.end()
  }
}

export async function cleanOldBackups(): Promise<{ eliminados: number }> {
  const supabase = createServiceClient()
  const { data: archivos, error } = await supabase.storage.from(BUCKET).list()

  if (error) {
    throw new Error(`Error listando backups: ${error.message}`)
  }

  const fechaLimite = new Date()
  fechaLimite.setDate(fechaLimite.getDate() - RETENCION_DIAS)

  const aEliminar =
    archivos
      ?.filter((f) => {
        const match = f.name.match(/^backup-(\d{4}-\d{2}-\d{2})\.json\.gz$/)
        return match && new Date(match[1]) < fechaLimite
      })
      .map((f) => f.name) ?? []

  if (aEliminar.length > 0) {
    const { error: removeError } = await supabase.storage
      .from(BUCKET)
      .remove(aEliminar)

    if (removeError) {
      throw new Error(`Error eliminando backups: ${removeError.message}`)
    }
  }

  return { eliminados: aEliminar.length }
}
