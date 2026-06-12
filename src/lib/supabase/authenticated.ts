import { createClient } from '@supabase/supabase-js'
import jwt from 'jsonwebtoken'

function signSupabaseJWT(userId: string): string {
  const secret = process.env.SUPABASE_JWT_SECRET!
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
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: `Bearer ${supabaseToken}` } },
    }
  )
}
