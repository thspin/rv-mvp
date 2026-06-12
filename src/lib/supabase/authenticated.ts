import { createClient } from '@supabase/supabase-js'
import jwt from 'jsonwebtoken'
import { loadEnv } from '@/lib/env'

loadEnv()

function signSupabaseJWT(userId: string): string {
  const secret = (process.env.SUPABASE_JWT_SECRET ?? "").trim();
  if (!secret) {
    throw new Error(
      "[CRITICAL] SUPABASE_JWT_SECRET is not set. Cannot sign Supabase auth JWT. " +
      "Get it from: Supabase Dashboard > Settings > API > JWT Secret"
    )
  }
  const payload = {
    sub: userId,
    role: 'authenticated',
    aud: 'authenticated',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  }
  return jwt.sign(payload, secret, { algorithm: 'HS256' })
}

export function createAuthenticatedClient(userId: string) {
  const supabaseToken = signSupabaseJWT(userId)
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  const key = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${supabaseToken}` } },
  })
}
