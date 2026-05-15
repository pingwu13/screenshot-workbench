import { NextRequest, NextResponse } from "next/server"
import { cardStore } from "@/lib/data-store"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status")
  const type = searchParams.get("type")
  const query = searchParams.get("q")

  let cards = cardStore.getAll()

  if (status) {
    cards = cards.filter((c) => c.status === status)
  }
  if (type) {
    cards = cards.filter((c) => c.type === type)
  }
  if (query) {
    const q = query.toLowerCase()
    cards = cards.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.summary.toLowerCase().includes(q) ||
        c.tags.some((t) => t.toLowerCase().includes(q))
    )
  }

  cards.sort(
    (a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  )

  return NextResponse.json(cards)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const card = cardStore.create(body)
  return NextResponse.json(card, { status: 201 })
}
