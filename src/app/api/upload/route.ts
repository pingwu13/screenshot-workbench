import { NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads")

export async function POST(req: NextRequest) {
  // Ensure upload directory exists
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true })
  }

  const formData = await req.formData()
  const file = formData.get("file") as File | null

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 })
  }

  const ext = file.name.split(".").pop() || "png"
  const filename = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  fs.writeFileSync(path.join(UPLOAD_DIR, filename), buffer)

  const imageUrl = `/uploads/${filename}`

  return NextResponse.json({ imageUrl })
}
