import { NextRequest, NextResponse } from "next/server"
import { getCurrentUserId, createAuthClient, getToken } from "@/lib/auth"

export async function GET(req: NextRequest) {
  const userId = await getCurrentUserId(req)
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const token = getToken(req)!
  const supabase = createAuthClient(token)

  try {
    // Fetch published announcements
    const { data: announcements, error: annError } = await supabase
      .from("announcements")
      .select("id, title, summary, content, level, created_at")
      .eq("is_published", true)
      .order("created_at", { ascending: false })

    if (annError) {
      console.error("[Announcements API] fetch error:", annError.message)
      return NextResponse.json({ error: "Failed to fetch announcements" }, { status: 500 })
    }

    // Fetch user's read records
    const { data: reads, error: readsError } = await supabase
      .from("announcement_reads")
      .select("announcement_id")
      .eq("user_id", userId)

    if (readsError) {
      console.error("[Announcements API] reads error:", readsError.message)
      return NextResponse.json({ error: "Failed to fetch reads" }, { status: 500 })
    }

    const readIds = new Set((reads || []).map((r) => r.announcement_id))

    const withRead = (announcements || []).map((a) => ({
      ...a,
      read: readIds.has(a.id),
    }))

    const unread_count = withRead.filter((a) => !a.read).length

    return NextResponse.json({ announcements: withRead, unread_count })
  } catch (err: any) {
    console.error("[Announcements API] error:", err?.message || err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
