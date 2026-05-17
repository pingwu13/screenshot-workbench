import { NextRequest, NextResponse } from "next/server"
import { getCurrentUserId, createAuthClient, getToken } from "@/lib/auth"

export async function GET(req: NextRequest) {
  const userId = await getCurrentUserId(req)
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = createAuthClient(getToken(req)!)

  try {
    const { data, error } = await supabase
      .from("creative_shortcuts")
      .select("*")
      .eq("user_id", userId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true })

    if (error) {
      console.error("[Creative API] GET error:", error.message)
      return NextResponse.json({ error: "Failed to fetch shortcuts" }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (err: any) {
    console.error("[Creative API] GET error:", err?.message || err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId(req)
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = createAuthClient(getToken(req)!)

  try {
    const body = await req.json()
    const { title, description, type, url, icon } = body

    if (!title?.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("creative_shortcuts")
      .insert({
        user_id: userId,
        title: title.trim(),
        description: description?.trim() || "",
        type: type || "website",
        url: url?.trim() || "",
        icon: icon?.trim() || "",
        sort_order: 0,
      })
      .select()
      .single()

    if (error) {
      console.error("[Creative API] POST error:", error.message)
      return NextResponse.json({ error: "Failed to create shortcut" }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (err: any) {
    console.error("[Creative API] POST error:", err?.message || err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
