import { NextRequest, NextResponse } from "next/server"
import { getCurrentUserId, getToken, createAuthClient } from "@/lib/auth"

export async function GET(req: NextRequest) {
  const userId = await getCurrentUserId(req)
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const token = getToken(req)!
  const supabase = createAuthClient(token)

  const { searchParams } = new URL(req.url)
  const cardId = searchParams.get("cardId") || null

  // Find or create session
  let session
  if (cardId) {
    // Verify card belongs to user
    const { data: card } = await supabase.from("cards").select("id").eq("id", cardId).eq("user_id", userId).single()
    if (!card) return NextResponse.json({ error: "Card not found" }, { status: 404 })

    const { data: existing } = await supabase.from("ai_chat_sessions").select("*").eq("user_id", userId).eq("card_id", cardId).maybeSingle()
    if (existing) { session = existing }
    else {
      const { data: created, error: createErr } = await supabase.from("ai_chat_sessions").insert({
        user_id: userId, card_id: cardId, mode: "card",
      }).select().single()
      if (createErr) return NextResponse.json({ error: createErr.message }, { status: 500 })
      session = created
    }
  } else {
    const { data: existing } = await supabase.from("ai_chat_sessions").select("*").eq("user_id", userId).is("card_id", null).maybeSingle()
    if (existing) { session = existing }
    else {
      const { data: created, error: createErr } = await supabase.from("ai_chat_sessions").insert({
        user_id: userId, mode: "general",
      }).select().single()
      if (createErr) return NextResponse.json({ error: createErr.message }, { status: 500 })
      session = created
    }
  }

  // Load messages
  const { data: messages, error: msgErr } = await supabase
    .from("ai_chat_messages")
    .select("*")
    .eq("session_id", session.id)
    .eq("user_id", userId)
    .order("created_at", { ascending: true })

  if (msgErr) return NextResponse.json({ error: msgErr.message }, { status: 500 })

  return NextResponse.json({ session, messages: messages ?? [] })
}
