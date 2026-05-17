import { NextRequest, NextResponse } from "next/server"
import { getCardStore } from "@/lib/supabase-store"
import { getCurrentUserId, getToken, createAuthClient } from "@/lib/auth"
import { isSupabaseConfigured } from "@/lib/supabase"

async function deleteStorageFile(token: string, userId: string, imagePath: string | null | undefined) {
  if (!imagePath) return
  if (isSupabaseConfigured()) {
    try { await createAuthClient(token).storage.from("screenshots").remove([`${userId}/${imagePath}`]) }
    catch (err) { console.warn("Storage delete failed:", err) }
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getCurrentUserId(req)
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  try {
    const store = getCardStore(userId, getToken(req) || undefined)
    const card = await store.getById(id)
    if (!card) return NextResponse.json({ error: "Card not found" }, { status: 404 })
    return NextResponse.json(card)
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getCurrentUserId(req)
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  try {
    const body = await req.json()
    const store = getCardStore(userId, getToken(req) || undefined)
    const card = await store.update(id, body)
    if (!card) return NextResponse.json({ error: "Card not found" }, { status: 404 })
    return NextResponse.json(card)
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getCurrentUserId(req)
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  try {
    const store = getCardStore(userId, getToken(req) || undefined)
    const card = await store.getById(id)
    if (!card) return NextResponse.json({ error: "Card not found" }, { status: 404 })
    if (card.imagePath) await deleteStorageFile(getToken(req)!, userId, card.imagePath)
    const deleted = await store.delete(id)
    if (!deleted) return NextResponse.json({ error: "Failed to delete" }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed" }, { status: 500 })
  }
}
