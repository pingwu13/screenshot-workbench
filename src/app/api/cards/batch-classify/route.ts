import { NextRequest, NextResponse } from "next/server"
import { getCurrentUserId } from "@/lib/auth"
import { isSupabaseConfigured, createClient } from "@/lib/supabase"
import { cardStore } from "@/lib/data-store"

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId(req)
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { cardIds, label } = await req.json()

  if (!Array.isArray(cardIds) || cardIds.length === 0) {
    return NextResponse.json({ error: "cardIds required" }, { status: 400 })
  }
  if (!label || typeof label !== "string" || !label.trim()) {
    return NextResponse.json({ error: "label required" }, { status: 400 })
  }

  const normalizedLabel = label.trim()
  let updatedCount = 0

  if (isSupabaseConfigured()) {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("cards")
      .update({ label: normalizedLabel, updated_at: new Date().toISOString() })
      .in("id", cardIds)
      .eq("user_id", userId)
      .select("id")

    if (error) {
      console.error("[BatchClassify] error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    updatedCount = data?.length ?? 0
  }

  for (const id of cardIds) {
    const r = cardStore.update(id, userId, { label: normalizedLabel })
    if (r) updatedCount++
  }

  return NextResponse.json({ updatedCount })
}
