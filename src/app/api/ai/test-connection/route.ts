import { NextRequest, NextResponse } from "next/server"
import { getCurrentUserId, getToken, createAuthClient } from "@/lib/auth"

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId(req)
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const token = getToken(req)!
  const supabase = createAuthClient(token)

  const { data: settings, error } = await supabase.from("ai_settings").select("*").eq("user_id", userId).maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const apiKey = settings?.api_key?.trim()
  if (!apiKey) return NextResponse.json({ ok: false, error: "请先填写 API Key" }, { status: 400 })

  const baseUrl = (settings?.base_url || "https://api.deepseek.com").replace(/\/+$/, "")
  const model = settings?.model || "deepseek-chat"

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, messages: [{ role: "user", content: "请只回复 OK" }], max_tokens: 4, stream: false }),
      signal: AbortSignal.timeout(15000),
    })

    if (!response.ok) {
      const errText = await response.text().catch(() => "")
      if (response.status === 401 || response.status === 403) {
        return NextResponse.json({ ok: false, error: "API Key 无效或无权访问" })
      }
      if (response.status === 404) {
        return NextResponse.json({ ok: false, error: "模型不存在或 Base URL 不正确" })
      }
      return NextResponse.json({ ok: false, error: `连接失败 (${response.status})：${errText.slice(0, 100)}` })
    }

    return NextResponse.json({ ok: true, message: "连接成功" })
  } catch (err: any) {
    const msg = err?.message || ""
    if (msg.includes("timeout") || msg.includes("abort")) {
      return NextResponse.json({ ok: false, error: "连接超时，请检查 Base URL 和网络" })
    }
    if (msg.includes("fetch")) {
      return NextResponse.json({ ok: false, error: "无法连接到 Base URL，请检查地址" })
    }
    return NextResponse.json({ ok: false, error: msg.slice(0, 100) || "连接失败" })
  }
}
