import { NextRequest, NextResponse } from "next/server"
import { getCurrentUserId, getToken, createAuthClient } from "@/lib/auth"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getCurrentUserId(req)
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const token = getToken(req)!
  const supabase = createAuthClient(token)
  const { id } = await params
  const { name, color, sort_order } = await req.json()

  const { data: old } = await supabase.from("card_categories").select("name").eq("id", id).eq("user_id", userId).single()
  if (!old) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (name !== undefined) {
    const trimmed = (name as string).trim()
    if (!trimmed || trimmed.length > 20) return NextResponse.json({ error: "分类名称1-20字符" }, { status: 400 })
    updates.name = trimmed
  }
  if (color !== undefined) {
    const allowed = ["gray", "red", "orange", "yellow", "green", "cyan", "blue", "purple", "pink", "brown"]
    updates.color = allowed.includes(color) ? color : "gray"
  }
  if (sort_order !== undefined) updates.sort_order = sort_order

  const { data, error } = await supabase.from("card_categories").update(updates).eq("id", id).eq("user_id", userId).select().single()
  if (error) {
    console.error("[Categories API] update failed:", error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // If name changed, sync cards.category
  if (updates.name && updates.name !== old.name) {
    await supabase.from("cards").update({ category: updates.name }).eq("user_id", userId).eq("category", old.name)
  }

  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getCurrentUserId(req)
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const token = getToken(req)!
  const supabase = createAuthClient(token)
  const { id } = await params

  const { data: cat } = await supabase.from("card_categories").select("name").eq("id", id).eq("user_id", userId).single()
  if (!cat) return NextResponse.json({ error: "Not found" }, { status: 404 })

  await supabase.from("cards").update({ category: "" }).eq("user_id", userId).eq("category", cat.name)
  const { error } = await supabase.from("card_categories").delete().eq("id", id).eq("user_id", userId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
