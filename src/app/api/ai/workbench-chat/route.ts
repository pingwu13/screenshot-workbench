import { NextRequest } from "next/server"
import { getCurrentUserId, getToken, createAuthClient } from "@/lib/auth"
import { isSupabaseConfigured } from "@/lib/supabase"
import { cardStore } from "@/lib/data-store"

const ENV_API_KEY = process.env.DEEPSEEK_API_KEY || ""

const STRENGTH_CONFIG: Record<string, { maxTokens: number; temperature: number; hint: string }> = {
  low:    { maxTokens: 800,  temperature: 0.3, hint: "请简洁回答，直接给出结论和步骤。" },
  medium: { maxTokens: 1600, temperature: 0.6, hint: "请在简洁和完整之间平衡。" },
  high:   { maxTokens: 3000, temperature: 0.7, hint: "请充分分析问题，给出更完整的推理、方案和风险提示。" },
}

function buildGeneralPrompt(reasoningHint?: string) {
  let p = "你是 DeepSeek Chat，一个个人 idea/task 工作台助手。帮助用户梳理想法、拆解任务、制定计划。当前没有绑定具体卡片。"
  if (reasoningHint) p += "\n" + reasoningHint
  return p
}

function buildCardPrompt(card: any, reasoningHint?: string) {
  let p = `你是 DeepSeek Chat，正在帮助用户处理当前卡片。
标题：${card.title || "未命名"}
分类：${card.category || "未分类"}
状态：${card.status || "未知"}
正文：${card.note || card.summary || "无"}
AI已有方案：${card.ai_plan || "无"}
下一步：${card.next_action || "无"}
请基于当前卡片给出具体建议。`
  if (reasoningHint) p += "\n" + reasoningHint
  return p
}

export async function POST(req: NextRequest) {
  const tTotal = Date.now()

  // 1. Auth
  const userId = await getCurrentUserId(req)
  if (!userId) return new Response("Unauthorized", { status: 401 })

  const token = getToken(req)!
  const supabase = createAuthClient(token)

  // 2. Read settings
  const { data: settings } = await supabase.from("ai_settings").select("*").eq("user_id", userId).maybeSingle()
  const baseUrl = (settings?.base_url || "https://api.deepseek.com").replace(/\/+$/, "")
  const apiKey = settings?.api_key?.trim() || ENV_API_KEY
  if (!apiKey) return new Response("请先在设置中配置 AI API Key", { status: 400 })

  const reasoningEnabled = settings?.reasoning_enabled ?? false
  const reasonStrength = settings?.reasoning_strength || "medium"
  const multiTurn = settings?.multi_turn_enabled ?? true
  const contextLimit = settings?.context_message_limit || 8

  // 3. Parse request
  const { cardId, message } = await req.json()
  if (!message?.trim()) return new Response("message required", { status: 400 })

  const isSimple = (m: string) => m.trim().length < 20 && !/分析|拆解|方案|比较|优劣|风险|排查|架构|设计|详细|计划|长文|多步骤|深入|代码|debug/i.test(m)
  const effectiveReasoning = reasoningEnabled && !isSimple(message)
  const model = effectiveReasoning ? "deepseek-reasoner" : "deepseek-chat"
  const strength = effectiveReasoning ? (STRENGTH_CONFIG[reasonStrength] || STRENGTH_CONFIG.medium) : { maxTokens: 800, temperature: 0.5, hint: "请简洁回答。" }

  console.log("[AI Chat]", { mode: cardId ? "card" : "general", model, reasoning: effectiveReasoning, simpleQ: isSimple(message) })

  // 4. Session
  let sessionId: string
  if (cardId && cardId !== "__general__") {
    const { data: card } = await supabase.from("cards").select("id").eq("id", cardId).eq("user_id", userId).single()
    if (!card) return new Response("Card not found", { status: 404 })
    const { data: s } = await supabase.from("ai_chat_sessions").select("id").eq("user_id", userId).eq("card_id", cardId).maybeSingle()
    if (s) { sessionId = s.id } else {
      const { data: c } = await supabase.from("ai_chat_sessions").insert({ user_id: userId, card_id: cardId, mode: "card" }).select("id").single()
      if (!c) return new Response("Failed to create session", { status: 500 })
      sessionId = c.id
    }
  } else {
    const { data: s } = await supabase.from("ai_chat_sessions").select("id").eq("user_id", userId).is("card_id", null).maybeSingle()
    if (s) { sessionId = s.id } else {
      const { data: c } = await supabase.from("ai_chat_sessions").insert({ user_id: userId, mode: "general" }).select("id").single()
      if (!c) return new Response("Failed to create session", { status: 500 })
      sessionId = c.id
    }
  }

  // 5. Save user message
  const userMsgId = crypto.randomUUID()
  await supabase.from("ai_chat_messages").insert({
    id: userMsgId, user_id: userId, session_id: sessionId, role: "user", content: message.trim(),
  })

  // 6. Build system prompt
  let systemPrompt: string
  if (cardId && cardId !== "__general__") {
    if (isSupabaseConfigured()) {
      const { data: card } = await supabase.from("cards").select("*").eq("id", cardId).eq("user_id", userId).single()
      systemPrompt = card ? buildCardPrompt(card, strength.hint) : buildGeneralPrompt(strength.hint)
    } else {
      const found = cardStore.getById(cardId, userId)
      systemPrompt = found ? buildCardPrompt(found, strength.hint) : buildGeneralPrompt(strength.hint)
    }
  } else {
    systemPrompt = buildGeneralPrompt(strength.hint)
  }

  // 7. Build messages
  const chatMessages: { role: string; content: string }[] = [{ role: "system", content: systemPrompt }]
  if (multiTurn) {
    const { data: history } = await supabase.from("ai_chat_messages")
      .select("role, content").eq("session_id", sessionId).order("created_at", { ascending: true }).limit(contextLimit * 2)
    if (history) for (const m of history) chatMessages.push({ role: m.role === "assistant" ? "assistant" : "user", content: m.content })
  } else {
    chatMessages.push({ role: "user", content: message.trim() })
  }

  console.log("[AI Chat] ctxCount:", chatMessages.length - 1)

  // 8. Call AI with streaming
  let aiRes: Response
  try {
    aiRes = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, messages: chatMessages, max_tokens: strength.maxTokens, temperature: strength.temperature, stream: true }),
      signal: AbortSignal.timeout(120000),
    })
  } catch (err: any) {
    return new Response(err?.message || "AI connection failed", { status: 500 })
  }

  if (!aiRes.ok) {
    const errText = await aiRes.text().catch(() => "")
    if (aiRes.status === 401 || aiRes.status === 403) return new Response("API Key 无效", { status: 500 })
    return new Response(`AI error ${aiRes.status}`, { status: 500 })
  }

  // 9. Stream response as SSE
  const aiMsgId = crypto.randomUUID()
  let fullContent = ""
  let firstTokenTime: number | null = null

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const reader = aiRes.body!.getReader()
        const decoder = new TextDecoder()
        let buffer = ""

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })

          const lines = buffer.split("\n")
          buffer = lines.pop() || ""

          for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed || !trimmed.startsWith("data: ")) continue
            const data = trimmed.slice(6)
            if (data === "[DONE]") continue

            try {
              const chunk = JSON.parse(data)
              const delta = chunk.choices?.[0]?.delta
              const content = delta?.content
              if (content) {
                if (!firstTokenTime) firstTokenTime = Date.now()
                fullContent += content
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "token", content })}\n\n`))
              }
            } catch {}
          }
        }

        const ttftMs = firstTokenTime ? firstTokenTime - tTotal : 0
        const totalMs = Date.now() - tTotal

        // Save assistant message with metadata
        await supabase.from("ai_chat_messages").insert({
          id: aiMsgId, user_id: userId, session_id: sessionId, role: "assistant", content: fullContent,
          metadata: { ttftMs, totalMs, model },
        })

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done", messageId: aiMsgId, ttftMs, totalMs, model, reasoning: effectiveReasoning })}\n\n`))
        console.log("[AI Timing]", { totalMs, ttftMs, model, ctxCount: chatMessages.length - 1 })

      } catch (err: any) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", message: err?.message || "stream failed" })}\n\n`))
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
    },
  })
}
