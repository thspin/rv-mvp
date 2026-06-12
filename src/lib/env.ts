import { z } from 'zod'

const isProd = process.env.NODE_ENV === 'production'
const isCI = process.env.CI === 'true'

const trimmedString = z
  .string()
  .transform((v) => v.trim())
  .refine((v) => v.length > 0, { message: 'must not be empty' })

const requiredInProd = trimmedString.optional()
const optionalString = trimmedString.optional()

const coreSchema = z.object({
  SUPABASE_JWT_SECRET: requiredInProd,
  NEXT_PUBLIC_SUPABASE_URL: requiredInProd,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: requiredInProd,
  SUPABASE_SERVICE_ROLE_KEY: requiredInProd,
  DATABASE_URL: requiredInProd,
  BETTER_AUTH_SECRET: requiredInProd,
  GOOGLE_CLIENT_ID: requiredInProd,
  GOOGLE_CLIENT_SECRET: requiredInProd,
  CRON_SECRET: requiredInProd,
  BETTER_AUTH_URL: requiredInProd,
})

const optionalSchema = z.object({
  UPSTASH_REDIS_REST_URL: optionalString,
  UPSTASH_REDIS_REST_TOKEN: optionalString,
  NEXT_PUBLIC_SENTRY_DSN: optionalString,
  SENTRY_ORG: optionalString,
  SENTRY_PROJECT: optionalString,
  SENTRY_AUTH_TOKEN: optionalString,
  VERCEL_URL: optionalString,
  NEXT_PUBLIC_APP_URL: optionalString,
  ENABLE_DEBUG_ENDPOINT: optionalString,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: optionalString,
})

export type Env = z.infer<typeof coreSchema> & z.infer<typeof optionalSchema>

function collectMissing(parsed: Record<string, unknown>, keys: string[]): string[] {
  return keys.filter((k) => {
    const v = parsed[k]
    return v === undefined || v === null || v === ''
  })
}

let cached: Env | null = null

export function loadEnv(): Env {
  if (cached) return cached

  const raw = Object.fromEntries(
    Object.entries(process.env).filter(([, v]) => typeof v === 'string'),
  )

  const core = coreSchema.safeParse(raw)
  const optional = optionalSchema.safeParse(raw)

  if (!core.success) {
    const issues = core.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n')
    throw new Error(
      `[env] Invalid environment variables:\n${issues}`,
    )
  }

  if (!optional.success) {
    const issues = optional.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n')
    throw new Error(
      `[env] Invalid optional environment variables:\n${issues}`,
    )
  }

  const merged = { ...core.data, ...optional.data } as Env

  if (isProd) {
    const missing = collectMissing(merged, Object.keys(coreSchema.shape))
    if (missing.length > 0) {
      throw new Error(
        `[env] Missing required environment variables in production:\n` +
          missing.map((k) => `  - ${k}`).join('\n') +
          `\n` +
          `Set them in Vercel (Project > Settings > Environment Variables) and redeploy.`,
      )
    }
  } else if (!isCI) {
    const missing = collectMissing(merged, Object.keys(coreSchema.shape))
    if (missing.length > 0) {
      // eslint-disable-next-line no-console
      console.warn(
        `[env] Missing required env vars in non-production (will not block):\n` +
          missing.map((k) => `  - ${k}`).join('\n'),
      )
    }

    const hasUpstashUrl = !!merged.UPSTASH_REDIS_REST_URL
    const hasUpstashToken = !!merged.UPSTASH_REDIS_REST_TOKEN
    if (hasUpstashUrl !== hasUpstashToken) {
      // eslint-disable-next-line no-console
      console.warn(
        `[env] Upstash is partially configured (URL=${hasUpstashUrl}, TOKEN=${hasUpstashToken}). ` +
          `Rate limiting will be disabled until both are set.`,
      )
    }
  }

  cached = merged
  return merged
}

export function isProduction(): boolean {
  return isProd
}

export function isCIEnv(): boolean {
  return isCI
}

export function resetEnvCacheForTests(): void {
  cached = null
}

if (isProd) {
  loadEnv()
}
