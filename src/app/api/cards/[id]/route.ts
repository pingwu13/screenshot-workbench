import { NextRequest, NextResponse } from "next/server"
import { getCardStore } from "@/lib/supabase-store"
import { getCurrentUserId } from "@/lib/auth"
import { isSupabaseConfigured, createClient } from "@/lib/supabase"

async function deleteStorageFile(userId: string, imagePath: string | null | undefined) {
  if (!imagePath) return
  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient()
      await supabase.storage.from("screenshots").remove([`${userId}/${imagePath}`])
    } catch (err) { console.warn("Storage delete failed:", err) }
    return
  }
  try {
    const fs = await import("fs")
    const path = await import("path")
    const fp = path.join(process.cwd(), "public", "uploads", userId, path.basename(imagePath))
    if (fs.existsSync(fp)) fs.unlinkSync(fp)
  } catch (err) { console.warn("Local delete failed:", err) }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getCurrentUserId(req)
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  try {
    const store = getCardStore(userId)
    const card = await store.getById(id)
    if (!card) return NextResponse.json({ error: "Card not found" }, { status: 404 })
    return NextResponse.json(card)
  } catch (err) {
    console.error("Failed to fetch card:", err)
    return NextResponse.json({ error: "Failed to fetch card" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getCurrentUserId(req)
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  try {
    const body = await req.json()
    const store = getCardStore(userId)
    const card = await store.update(id, body)
    if (!card) return NextResponse.json({ error: "Card not found" }, { status: 404 })
    return NextResponse.json(card)
  } catch (err) {
    console.error("Failed to update card:", err)
    return NextResponse.json({ error: "Failed to update card" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getCurrentUserId(req)
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  try {
    const store = getCardStore(userId)
    const card = await store.getById(id)
    if (!card) return NextResponse.json({ error: "Card not found" }, { status: 404 })

    if (card.imagePath || card.imageUrl) {
      await deleteStorageFile(userId, card.imagePath || extractPathFromUrl(card.imageUrl))
    }

    const deleted = await store.delete(id)
    if (!deleted) return NextResponse.json({ error: "Failed to delete card" }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("Failed to delete card:", err)
    return NextResponse.json({ error: "Failed to delete card" }, { status: 500 })
  }
}

function extractPathFromUrl(url: string): string | null {
  if (!url) return null
  try {
    const u = new URL(url)
    const parts = u.pathname.split("/")
    const idx = parts.indexOf("screenshots")
    if (idx === -1) return null
    return parts.slice(idx + 1).join("/") || null
  } catch {
    return url.startsWith("http") ? null : url
  }
}
