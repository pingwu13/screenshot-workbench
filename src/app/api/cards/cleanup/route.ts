import { NextRequest, NextResponse } from "next/server"
import { getCurrentUserId } from "@/lib/auth"
import { isSupabaseConfigured, createClient } from "@/lib/supabase"
import { cardStore } from "@/lib/data-store"

const ALLOWED_DAYS = [30, 60, 180]

export async function GET(req: NextRequest) {
  const userId = await getCurrentUserId(req)
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const days = parseInt(searchParams.get("days") || "60")
  if (!ALLOWED_DAYS.includes(days)) {
    return NextResponse.json({ error: "days must be 30, 60, or 180" }, { status: 400 })
  }

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  const cutoffStr = cutoff.toISOString()

  const cards = cardStore.getAll(userId)
  const oldCards = cards.filter((c) => c.createdAt < cutoffStr)

  return NextResponse.json({ count: oldCards.length, cutoffDate: cutoffStr.slice(0, 10) })
}

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId(req)
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { days, confirmText } = await req.json()

  if (!ALLOWED_DAYS.includes(days)) {
    return NextResponse.json({ error: "days must be 30, 60, or 180" }, { status: 400 })
  }
  if (confirmText !== "DELETE") {
    return NextResponse.json({ error: "confirmText must be DELETE" }, { status: 400 })
  }

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  const cutoffStr = cutoff.toISOString()

  const cards = cardStore.getAll(userId)
  const toDelete = cards.filter((c) => c.createdAt < cutoffStr)

  let deleted = 0
  for (const card of toDelete) {
    if (cardStore.delete(card.id, userId)) deleted++
  }

  // Also delete from Supabase if configured
  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient()
      await supabase.from("cards").delete().eq("user_id", userId).lt("created_at", cutoffStr)
    } catch (err) { console.error("Supabase cleanup error:", err) }
  }

  return NextResponse.json({ deleted })
}
