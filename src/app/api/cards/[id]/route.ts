import { NextRequest, NextResponse } from "next/server"
import { cardStore } from "@/lib/data-store"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const card = cardStore.getById(id)
  if (!card) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 })
  }
  return NextResponse.json(card)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json()
  const card = cardStore.update(id, body)
  if (!card) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 })
  }
  return NextResponse.json(card)
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const deleted = cardStore.delete(id)
  if (!deleted) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 })
  }
  return NextResponse.json({ success: true })
}
