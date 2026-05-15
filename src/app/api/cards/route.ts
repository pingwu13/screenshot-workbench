import { NextRequest, NextResponse } from "next/server"
import { getCardStore } from "@/lib/supabase-store"
import { getCurrentUserId } from "@/lib/auth"

export async function GET(req: NextRequest) {
  const userId = await getCurrentUserId(req)
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status")
  const type = searchParams.get("type")
  const query = searchParams.get("q")

  try {
    const store = getCardStore(userId)
    let cards = query ? await store.search(query) : await store.getAll()

    if (status) cards = cards.filter((c) => c.status === status)
    if (type) cards = cards.filter((c) => c.type === type)

    return NextResponse.json(cards)
  } catch (err) {
    console.error("Failed to fetch cards:", err)
    return NextResponse.json({ error: "Failed to fetch cards" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId(req)
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const store = getCardStore(userId)
    const card = await store.create(body)
    return NextResponse.json(card, { status: 201 })
  } catch (err) {
    console.error("Failed to create card:", err)
    return NextResponse.json({ error: "Failed to create card" }, { status: 500 })
  }
}
