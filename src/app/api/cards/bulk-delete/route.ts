import { NextRequest, NextResponse } from "next/server"
import { getCurrentUserId, getToken, createAuthClient } from "@/lib/auth"
import { isSupabaseConfigured } from "@/lib/supabase"

const MAX_BATCH_SIZE = 100

export async function DELETE(req: NextRequest) {
  const userId = await getCurrentUserId(req)
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const token = getToken(req)!
  const supabase = createAuthClient(token)

  let body: { cardIds?: string[] }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const { cardIds } = body
  if (!Array.isArray(cardIds) || cardIds.length === 0) {
    return NextResponse.json({ error: "cardIds must be a non-empty array" }, { status: 400 })
  }
  if (cardIds.length > MAX_BATCH_SIZE) {
    return NextResponse.json({ error: `Cannot delete more than ${MAX_BATCH_SIZE} cards at once` }, { status: 400 })
  }

  try {
    // Fetch cards to get image paths (only current user's cards)
    const { data: cards, error: fetchErr } = await supabase
      .from("cards")
      .select("id, image_path, images")
      .in("id", cardIds)
      .eq("user_id", userId)

    if (fetchErr) {
      console.error("[BulkDelete] fetch cards error:", fetchErr.message)
      return NextResponse.json({ error: "Failed to fetch cards" }, { status: 500 })
    }

    if (!cards || cards.length === 0) {
      return NextResponse.json({ error: "No matching cards found" }, { status: 404 })
    }

    // Collect all storage paths that need cleanup
    const storagePaths: string[] = []
    for (const card of cards) {
      // Single image path (if any)
      const imagePath = card.image_path as string | null
      if (imagePath) storagePaths.push(imagePath)

      // Multiple images array (if any)
      const images = card.images as string[] | null
      if (images && images.length > 0) {
        for (const imgUrl of images) {
          // Extract storage path from signed URL or direct path
          const path = extractStoragePath(imgUrl)
          if (path) storagePaths.push(path)
        }
      }
    }

    // Delete cards from database
    const { data: deleted, error: deleteErr } = await supabase
      .from("cards")
      .delete()
      .in("id", cardIds)
      .eq("user_id", userId)
      .select("id")

    if (deleteErr) {
      console.error("[BulkDelete] delete cards error:", deleteErr.message)
      return NextResponse.json({ error: "Failed to delete cards" }, { status: 500 })
    }

    const deletedCount = deleted?.length ?? 0

    // Clean up storage files (best-effort — failures are logged but don't roll back)
    if (isSupabaseConfigured() && storagePaths.length > 0) {
      const uniquePaths = [...new Set(storagePaths)]
      // Supabase remove supports up to ~1000 items; chunk if needed
      for (let i = 0; i < uniquePaths.length; i += 900) {
        const chunk = uniquePaths.slice(i, i + 900)
        try {
          const { error: storageErr } = await supabase.storage
            .from("screenshots")
            .remove(chunk)
          if (storageErr) {
            console.warn("[BulkDelete] storage cleanup warning:", storageErr.message)
          }
        } catch (err: any) {
          console.warn("[BulkDelete] storage cleanup failed:", err?.message || err)
        }
      }
    }

    return NextResponse.json({ deleted: deletedCount })
  } catch (err: any) {
    console.error("[BulkDelete] error:", err?.message || err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

function extractStoragePath(url: string): string | null {
  if (!url) return null
  try {
    // Try to parse as Supabase signed URL: /storage/v1/object/sign/screenshots/<path>
    const match = url.match(/\/screenshots\/(.+?)(?:\?|$)/)
    if (match) return decodeURIComponent(match[1])
  } catch {}
  return null
}
