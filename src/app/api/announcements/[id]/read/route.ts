import { NextRequest, NextResponse } from "next/server"
import { getCurrentUserId, createAuthClient, getToken } from "@/lib/auth"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getCurrentUserId(req)
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const token = getToken(req)!
  const supabase = createAuthClient(token)
  const { id } = await params

  try {
    // Verify announcement exists and is published
    const { data: announcement, error: annError } = await supabase
      .from("announcements")
      .select("id")
      .eq("id", id)
      .eq("is_published", true)
      .single()

    if (annError || !announcement) {
      return NextResponse.json({ error: "Announcement not found" }, { status: 404 })
    }

    // Upsert read record
    const { error: upsertError } = await supabase
      .from("announcement_reads")
      .upsert(
        { user_id: userId, announcement_id: id, read_at: new Date().toISOString() },
        { onConflict: "user_id,announcement_id" }
      )

    if (upsertError) {
      console.error("[Announcements API] mark read error:", upsertError.message)
      return NextResponse.json({ error: "Failed to mark as read" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error("[Announcements API] mark read error:", err?.message || err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
