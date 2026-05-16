import { createClient, SupabaseClient } from "@supabase/supabase-js"

// Singleton browser Supabase client — shared by AuthProvider and all pages
let _client: SupabaseClient | undefined

export function getBrowserClient(): SupabaseClient {
  if (_client) return _client

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  console.log("[Supabase] init browser client — url:", !!url, "key:", !!key)

  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Check .env.local")
  }

  _client = createClient(url, key)
  return _client
}
