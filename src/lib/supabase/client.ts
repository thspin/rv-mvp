import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | null = null

export function createClient() {
  if (client) return client
  client = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key',
  )
  return client
}
