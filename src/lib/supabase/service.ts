import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "@/lib/env";

loadEnv();

export function createServiceClient() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
  if (!url) throw new Error("[CRITICAL] NEXT_PUBLIC_SUPABASE_URL is not set")
  if (!key) throw new Error("[CRITICAL] SUPABASE_SERVICE_ROLE_KEY is not set")
  return createClient(url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
