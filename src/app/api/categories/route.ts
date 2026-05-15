import { NextRequest, NextResponse } from "next/server"
import { getCurrentUserId } from "@/lib/auth"
import { isSupabaseConfigured, createClient } from "@/lib/supabase"

export async function GET(req: NextRequest) {
  const userId = await getCurrentUserId(req)
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  if (isSupabaseConfigured()) {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("card_categories")
      .select("*")
      .eq("user_id", userId)
      .order("sort_order")
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data ?? [])
  }

  return NextResponse.json([])
}

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId(req)
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { name, color } = await req.json()
  const trimmed = (name || "").trim()
  if (!trimmed || trimmed.length > 20) {
    return NextResponse.json({ error: "分类名称为1-20个字符" }, { status: 400 })
  }

  if (isSupabaseConfigured()) {
    const supabase = createClient()
    // Check duplicate
    const { data: existing } = await supabase.from("card_categories").select("id").eq("user_id", userId).eq("name", trimmed).maybeSingle()
    if (existing) return NextResponse.json({ error: "分类名称已存在" }, { status: 400 })

    // Get max sort_order
    const { data: maxData } = await supabase.from("card_categories").select("sort_order").eq("user_id", userId).order("sort_order", { ascending: false }).limit(1).maybeSingle()
    const nextOrder = (maxData?.sort_order ?? 0) + 1

    const { data, error } = await supabase.from("card_categories").insert({
      user_id: userId, name: trimmed, color: color || "gray", sort_order: nextOrder,
    }).select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data, { status: 201 })
  }

  return NextResponse.json({ name: trimmed, color, sort_order: 0 }, { status: 201 })
}
