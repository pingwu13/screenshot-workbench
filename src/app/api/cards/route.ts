import { NextRequest, NextResponse } from "next/server"
import { getCardStore } from "@/lib/supabase-store"
import { getCurrentUserId, getToken } from "@/lib/auth"

export async function GET(req: NextRequest) {
  const userId = await getCurrentUserId(req)
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status")
  const type = searchParams.get("type")
  const query = searchParams.get("q")
  const date = searchParams.get("date")

  try {
    const store = getCardStore(userId, getToken(req) || undefined)
    let cards = query ? await store.search(query) : await store.getAll()
    if (status) cards = cards.filter((c) => c.status === status)
    if (type) cards = cards.filter((c) => c.type === type)
    if (date) {
      cards = cards.filter((c) => {
        const created = c.createdAt?.slice(0, 10)
        const updated = c.updatedAt?.slice(0, 10)
        return created === date || updated === date
      })
    }
    return NextResponse.json(cards)
  } catch (err: any) {
    console.error("[Cards API] GET error:", err?.message || err)
    return NextResponse.json({ error: "Failed to fetch cards" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId(req)
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const token = getToken(req)
    const store = getCardStore(userId, token || undefined)
    const card = await store.create(body)
    return NextResponse.json(card, { status: 201 })
  } catch (err: any) {
    console.error("[Cards API] POST error:", err?.message || err, err?.code, err?.details)
    return NextResponse.json({ error: err?.message || "Failed to create card" }, { status: 500 })
  }
}
