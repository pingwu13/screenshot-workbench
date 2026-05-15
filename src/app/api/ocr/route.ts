import { NextRequest, NextResponse } from "next/server"
import { getOcrService } from "@/services/ocr"

export async function POST(req: NextRequest) {
  const { imageUrl } = await req.json()

  if (!imageUrl) {
    return NextResponse.json({ error: "imageUrl is required" }, { status: 400 })
  }

  const ocrService = getOcrService()
  const result = await ocrService.recognize(imageUrl)

  return NextResponse.json(result)
}
