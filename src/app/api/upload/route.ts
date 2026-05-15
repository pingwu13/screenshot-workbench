import { NextRequest, NextResponse } from "next/server"
import { isSupabaseConfigured } from "@/lib/supabase"
import { getCurrentUserId, getToken, createAuthClient } from "@/lib/auth"
import fs from "fs"
import path from "path"

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads")

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId(req)
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const token = getToken(req)!

  const formData = await req.formData()
  const file = formData.get("file") as File | null
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 })

  const ext = file.name.split(".").pop() || "png"
  const filename = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())
  const storagePath = `${userId}/${filename}`

  if (isSupabaseConfigured()) {
    const supabase = createAuthClient(token)
    const { data, error } = await supabase.storage
      .from("screenshots")
      .upload(storagePath, buffer, { contentType: file.type || "image/png", upsert: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const { data: signed } = await supabase.storage
      .from("screenshots")
      .createSignedUrl(data.path, 60 * 60 * 24 * 365)

    return NextResponse.json({ imageUrl: signed?.signedUrl || "", storageKey: filename })
  }

  const userDir = path.join(UPLOAD_DIR, userId)
  if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true })
  fs.writeFileSync(path.join(userDir, filename), buffer)

  return NextResponse.json({ imageUrl: `/uploads/${userId}/${filename}`, storageKey: filename })
}

export async function DELETE(req: NextRequest) {
  const userId = await getCurrentUserId(req)
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const token = getToken(req)!

  const { searchParams } = new URL(req.url)
  const storageKey = searchParams.get("key")
  if (!storageKey) return NextResponse.json({ error: "storageKey is required" }, { status: 400 })

  const storagePath = `${userId}/${storageKey}`

  if (isSupabaseConfigured()) {
    const supabase = createAuthClient(token)
    const { error } = await supabase.storage.from("screenshots").remove([storagePath])
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    const fp = path.join(UPLOAD_DIR, userId, path.basename(storageKey))
    if (fs.existsSync(fp)) fs.unlinkSync(fp)
  }

  return NextResponse.json({ success: true })
}
