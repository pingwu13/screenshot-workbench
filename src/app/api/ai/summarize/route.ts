import { NextRequest, NextResponse } from "next/server"
import { getAiService } from "@/services/ai"

export async function POST(req: NextRequest) {
  const { ocrText } = await req.json()

  if (!ocrText) {
    return NextResponse.json({ error: "ocrText is required" }, { status: 400 })
  }

  const aiService = getAiService()
  const result = await aiService.summarize(ocrText)

  return NextResponse.json(result)
}
