import { NextRequest, NextResponse } from "next/server"
import { getCurrentUserId, getToken, createAuthClient } from "@/lib/auth"
import { DEFAULT_CATEGORIES } from "@/lib/category-colors"

export async function GET(req: NextRequest) {
  const userId = await getCurrentUserId(req)
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const token = getToken(req)!
  const supabase = createAuthClient(token)

  // Also scan cards.category for labels not in categories yet
  let { data, error } = await supabase
    .from("card_categories")
    .select("*")
    .eq("user_id", userId)
    .order("sort_order")

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (!data || data.length === 0) {
    // Seed defaults
    const rows = DEFAULT_CATEGORIES.map((c, i) => ({
      user_id: userId, name: c.name, color: c.color, sort_order: i,
    }))

    // Also check existing cards for labels not in defaults
    const { data: cards } = await supabase.from("cards").select("category").eq("user_id", userId).not("category", "is", null).neq("category", "")
    if (cards) {
      const existingNames = new Set(rows.map((r) => r.name))
      let nextOrder = rows.length
      const seen = new Set<string>()
      for (const card of cards) {
        const name = card.category?.trim()
        if (name && !existingNames.has(name) && !seen.has(name)) {
          seen.add(name)
          rows.push({ user_id: userId, name, color: "gray", sort_order: nextOrder++ })
        }
      }
    }

    const { data: seeded, error: seedErr } = await supabase
      .from("card_categories").insert(rows).select("*").order("sort_order")

    if (seedErr) {
      console.error("[Categories API] seed failed:", seedErr.message, seedErr.details)
    } else if (seeded) {
      data = seeded
    }
  }

  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId(req)
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const token = getToken(req)!
  const supabase = createAuthClient(token)

  const { name, color } = await req.json()
  const trimmed = (name || "").trim()
  if (!trimmed || trimmed.length > 20) {
    return NextResponse.json({ error: "分类名称为1-20个字符" }, { status: 400 })
  }

  const allowed = ["gray", "red", "orange", "yellow", "green", "cyan", "blue", "purple", "pink", "brown"]
  const safeColor = allowed.includes(color) ? color : "gray"

  const { data: existing } = await supabase.from("card_categories").select("id").eq("user_id", userId).eq("name", trimmed).maybeSingle()
  if (existing) return NextResponse.json({ error: "分类名称已存在" }, { status: 409 })

  const { data: maxData } = await supabase.from("card_categories").select("sort_order").eq("user_id", userId).order("sort_order", { ascending: false }).limit(1).maybeSingle()
  const nextOrder = (maxData?.sort_order ?? 0) + 1

  const { data, error } = await supabase.from("card_categories").insert({
    user_id: userId, name: trimmed, color: safeColor, sort_order: nextOrder,
  }).select().single()

  if (error) {
    console.error("[Categories API] create failed:", { code: error.code, message: error.message, details: error.details })
    return NextResponse.json({ error: error.message, code: error.code, details: error.details }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
