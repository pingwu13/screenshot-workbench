import { createClient as createSupabaseClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

export function createClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase credentials not configured")
  }
  return createSupabaseClient(supabaseUrl, supabaseAnonKey)
}

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey)
}
