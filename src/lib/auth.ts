import { NextRequest } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function getCurrentUserId(req: NextRequest): Promise<string | null> {
  try {
    const authHeader = req.headers.get("authorization")
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length)
      : null

    if (!token) {
      console.log("[API Auth] no bearer token")
      return null
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    const { data, error } = await supabase.auth.getUser(token)

    if (error || !data.user) {
      console.error("[API Auth] getUser failed:", error?.message)
      return null
    }

    console.log("[API Auth] user:", data.user.id.slice(0, 8) + "...")
    return data.user.id
  } catch (err) {
    console.error("[API Auth] exception:", err)
    return null
  }
}
