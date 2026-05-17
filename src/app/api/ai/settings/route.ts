import { NextRequest, NextResponse } from "next/server"
import { getCurrentUserId, getToken, createAuthClient } from "@/lib/auth"

const VALID_PROVIDERS = ["deepseek", "openai-compatible", "custom"]
const VALID_STRENGTHS = ["low", "medium", "high"]

function maskApiKey(key: string): { has_api_key: boolean; api_key_preview: string } {
  const trimmed = key?.trim() || ""
  if (!trimmed) return { has_api_key: false, api_key_preview: "" }
  if (trimmed.length <= 8) return { has_api_key: true, api_key_preview: "****" }
  return { has_api_key: true, api_key_preview: trimmed.slice(0, 4) + "****" + trimmed.slice(-4) }
}

function normalizeBaseUrl(url: string): string {
  let u = url?.trim() || ""
  if (!u) return "https://api.deepseek.com"
  if (!u.startsWith("http")) u = "https://" + u
  return u.replace(/\/+$/, "")
}

// GET: read settings (API key masked)
export async function GET(req: NextRequest) {
  const userId = await getCurrentUserId(req)
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const token = getToken(req)!
  const supabase = createAuthClient(token)

  const { data, error } = await supabase.from("ai_settings").select("*").eq("user_id", userId).maybeSingle()

  if (error) {
    console.error("[AI Settings] GET error:", error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!data) {
    // Return defaults
    return NextResponse.json({
      provider: "deepseek",
      base_url: "https://api.deepseek.com",
      model: "deepseek-chat",
      reasoning_enabled: false,
      reasoning_strength: "medium",
      multi_turn_enabled: true,
      context_message_limit: 8,
      ...maskApiKey(""),
    })
  }

  return NextResponse.json({
    provider: data.provider,
    base_url: data.base_url,
    model: data.model,
    reasoning_enabled: data.reasoning_enabled,
    reasoning_strength: data.reasoning_strength,
    multi_turn_enabled: data.multi_turn_enabled,
    context_message_limit: data.context_message_limit,
    ...maskApiKey(data.api_key),
  })
}

// PATCH: update settings
export async function PATCH(req: NextRequest) {
  const userId = await getCurrentUserId(req)
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const token = getToken(req)!
  const supabase = createAuthClient(token)

  const body = await req.json()
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if (body.provider !== undefined) {
    if (!VALID_PROVIDERS.includes(body.provider)) return NextResponse.json({ error: "Invalid provider" }, { status: 400 })
    updates.provider = body.provider
  }
  if (body.base_url !== undefined) {
    updates.base_url = normalizeBaseUrl(body.base_url)
  }
  if (body.model !== undefined) {
    if (!body.model?.trim()) return NextResponse.json({ error: "model required" }, { status: 400 })
    updates.model = body.model.trim()
  }
  if (body.reasoning_enabled !== undefined) updates.reasoning_enabled = !!body.reasoning_enabled
  if (body.reasoning_strength !== undefined) {
    if (!VALID_STRENGTHS.includes(body.reasoning_strength)) return NextResponse.json({ error: "Invalid strength" }, { status: 400 })
    updates.reasoning_strength = body.reasoning_strength
  }
  if (body.multi_turn_enabled !== undefined) updates.multi_turn_enabled = !!body.multi_turn_enabled
  if (body.context_message_limit !== undefined) {
    const n = parseInt(body.context_message_limit) || 8
    if (n < 1 || n > 40) return NextResponse.json({ error: "context_message_limit 1-40" }, { status: 400 })
    updates.context_message_limit = n
  }
  // Only update api_key if explicitly provided with a non-empty value
  if (body.api_key !== undefined && body.api_key !== null) {
    if (body.api_key === "__CLEAR__") {
      updates.api_key = ""
    } else if (body.api_key.trim()) {
      updates.api_key = body.api_key.trim()
    }
    // If empty string, don't clear — skip
  }

  const { data, error } = await supabase.from("ai_settings").upsert({
    user_id: userId,
    ...updates,
  }, { onConflict: "user_id" }).select().single()

  if (error) {
    console.error("[AI Settings] PATCH error:", error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    provider: data.provider,
    base_url: data.base_url,
    model: data.model,
    reasoning_enabled: data.reasoning_enabled,
    reasoning_strength: data.reasoning_strength,
    multi_turn_enabled: data.multi_turn_enabled,
    context_message_limit: data.context_message_limit,
    ...maskApiKey(data.api_key),
  })
}
