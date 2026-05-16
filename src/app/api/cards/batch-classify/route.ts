import { NextRequest, NextResponse } from "next/server"
import { getCurrentUserId, getToken, createAuthClient } from "@/lib/auth"
import { cardStore } from "@/lib/data-store"

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId(req)
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const token = getToken(req)!

  const { cardIds, category } = await req.json()

  if (!Array.isArray(cardIds) || cardIds.length === 0) {
    return NextResponse.json({ error: "cardIds required" }, { status: 400 })
  }
  if (!category || typeof category !== "string" || !category.trim()) {
    return NextResponse.json({ error: "category required" }, { status: 400 })
  }

  const normalizedCategory = category.trim()
  let updatedCount = 0

  const supabase = createAuthClient(token)
  const { data, error } = await supabase
    .from("cards")
    .update({ category: normalizedCategory, updated_at: new Date().toISOString() })
    .in("id", cardIds)
    .eq("user_id", userId)
    .select("id")

  if (error) {
    console.error("[BatchClassify] error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  updatedCount = data?.length ?? 0

  for (const id of cardIds) {
    cardStore.update(id, userId, { category: normalizedCategory })
  }

  return NextResponse.json({ updatedCount })
}
