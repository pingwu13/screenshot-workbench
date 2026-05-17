import { NextRequest, NextResponse } from "next/server"
import { getCurrentUserId, getToken, createAuthClient } from "@/lib/auth"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getCurrentUserId(req)
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: cardId } = await params
  const token = getToken(req)!
  const supabase = createAuthClient(token)

  // Verify card belongs to user
  const { data: card } = await supabase.from("cards").select("id").eq("id", cardId).eq("user_id", userId).single()
  if (!card) return NextResponse.json({ error: "Card not found" }, { status: 404 })

  const { data, error } = await supabase
    .from("card_ai_plans")
    .select("*")
    .eq("card_id", cardId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getCurrentUserId(req)
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: cardId } = await params
  const token = getToken(req)!
  const supabase = createAuthClient(token)

  // Verify card belongs to user
  const { data: card } = await supabase.from("cards").select("id").eq("id", cardId).eq("user_id", userId).single()
  if (!card) return NextResponse.json({ error: "Card not found" }, { status: 404 })

  const { title, summary, content } = await req.json()
  if (!content || !content.trim()) {
    return NextResponse.json({ error: "content required" }, { status: 400 })
  }

  // Get plan count for default title
  const { count } = await supabase
    .from("card_ai_plans")
    .select("*", { count: "exact", head: true })
    .eq("card_id", cardId)
    .eq("user_id", userId)

  const autoTitle = title?.trim() || `方案 ${(count ?? 0) + 1}`
  const autoSummary = summary?.trim() || content.trim().slice(0, 50)

  const { data, error } = await supabase
    .from("card_ai_plans")
    .insert({
      user_id: userId,
      card_id: cardId,
      title: autoTitle,
      summary: autoSummary,
      content: content.trim(),
    })
    .select()
    .single()

  if (error) {
    console.error("[AI Plans] create failed:", error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
