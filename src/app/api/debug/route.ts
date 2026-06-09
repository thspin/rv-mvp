import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
  const result: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
  }

  // 1. Check env vars (keys only, never values)
  result.env = {
    DATABASE_URL: !!process.env.DATABASE_URL,
    BETTER_AUTH_SECRET: !!process.env.BETTER_AUTH_SECRET,
    NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    GOOGLE_CLIENT_ID: !!process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: !!process.env.GOOGLE_CLIENT_SECRET,
    VERCEL_URL: process.env.VERCEL_URL || null,
  }

  // 2. Check Better Auth session
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })
    result.session = session
      ? { userId: session.user?.id, email: session.user?.email, hasSession: true }
      : { hasSession: false }
  } catch (err) {
    result.session = { error: String(err) }
  }

  // 3. Check Supabase service client
  try {
    const { createServiceClient } = await import('@/lib/supabase/service')
    const supabase = createServiceClient()
    const { error } = await supabase.from('athletes').select('count').limit(1)
    result.supabase = error ? { error: error.message, code: error.code } : { ok: true }
  } catch (err) {
    result.supabase = { error: String(err) }
  }

  return NextResponse.json(result)
}
