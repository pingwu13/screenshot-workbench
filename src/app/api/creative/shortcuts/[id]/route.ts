import { NextRequest, NextResponse } from "next/server"
import { getCurrentUserId, createAuthClient, getToken } from "@/lib/auth"

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getCurrentUserId(req)
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = createAuthClient(getToken(req)!)
  const { id } = await params

  try {
    const body = await req.json()
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

    if (body.title !== undefined) updates.title = body.title?.trim() || ""
    if (body.description !== undefined) updates.description = body.description?.trim() || ""
    if (body.type !== undefined) updates.type = body.type
    if (body.url !== undefined) updates.url = body.url?.trim() || ""
    if (body.icon !== undefined) updates.icon = body.icon?.trim() || ""
    if (body.sort_order !== undefined) updates.sort_order = body.sort_order

    if (updates.title === "") {
      return NextResponse.json({ error: "Title is required" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("creative_shortcuts")
      .update(updates)
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .single()

    if (error) {
      console.error("[Creative API] PATCH error:", error.message)
      return NextResponse.json({ error: "Failed to update shortcut" }, { status: 500 })
    }

    if (!data) return NextResponse.json({ error: "Shortcut not found" }, { status: 404 })

    return NextResponse.json(data)
  } catch (err: any) {
    console.error("[Creative API] PATCH error:", err?.message || err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getCurrentUserId(req)
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = createAuthClient(getToken(req)!)
  const { id } = await params

  try {
    const { error } = await supabase
      .from("creative_shortcuts")
      .delete()
      .eq("id", id)
      .eq("user_id", userId)

    if (error) {
      console.error("[Creative API] DELETE error:", error.message)
      return NextResponse.json({ error: "Failed to delete shortcut" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error("[Creative API] DELETE error:", err?.message || err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
