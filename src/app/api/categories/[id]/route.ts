import { NextRequest, NextResponse } from "next/server"
import { getCurrentUserId } from "@/lib/auth"
import { isSupabaseConfigured, createClient } from "@/lib/supabase"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getCurrentUserId(req)
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const { name, color, sort_order } = await req.json()

  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Not configured" }, { status: 500 })

  const supabase = createClient()

  // Get old name for cards sync
  const { data: old } = await supabase.from("card_categories").select("name").eq("id", id).eq("user_id", userId).single()
  if (!old) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (name !== undefined) {
    const trimmed = (name as string).trim()
    if (!trimmed || trimmed.length > 20) return NextResponse.json({ error: "分类名称1-20字符" }, { status: 400 })
    updates.name = trimmed
  }
  if (color !== undefined) updates.color = color
  if (sort_order !== undefined) updates.sort_order = sort_order

  const { data, error } = await supabase.from("card_categories").update(updates).eq("id", id).eq("user_id", userId).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // If name changed, sync cards.category
  if (updates.name && updates.name !== old.name) {
    await supabase.from("cards").update({ category: updates.name }).eq("user_id", userId).eq("label", old.name)
  }

  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getCurrentUserId(req)
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Not configured" }, { status: 500 })

  const supabase = createClient()

  // Get name before deleting
  const { data: cat } = await supabase.from("card_categories").select("name").eq("id", id).eq("user_id", userId).single()
  if (!cat) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // Clear label on cards using this category
  await supabase.from("cards").update({ category: "" }).eq("user_id", userId).eq("label", cat.name)

  // Delete category
  const { error } = await supabase.from("card_categories").delete().eq("id", id).eq("user_id", userId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true, clearedCards: true })
}
