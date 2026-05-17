"use client"

import { Suspense, useCallback, useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CARD_STATUS_LABELS, CardStatus } from "@/types/card"
import { ProtectedPage } from "@/components/layout/protected-page"
import { authFetch } from "@/lib/api-client"
import { getBrowserClient } from "@/lib/supabase-browser"
import { getCategoryColorClass } from "@/lib/category-colors"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { toast } from "sonner"
import { ArrowLeft, Sparkles, Send, Lightbulb, ListChecks, ClipboardList, ArrowRight, FileText, Loader2, Check, Bookmark, Search, X } from "lucide-react"

interface ChatMessage { id: string; role: string; content: string; created_at?: string; metadata?: { ttftMs?: number; totalMs?: number; model?: string } }
interface CatItem { id: string; name: string; color: string; sort_order: number }

const ALL_STATUSES: CardStatus[] = ["inbox", "planned", "doing", "done", "archived"]
const CARD_ACTIONS = [
  { label: "帮我理解这个任务", icon: Lightbulb },
  { label: "拆解执行步骤", icon: ListChecks },
  { label: "给我一个处理方案", icon: ClipboardList },
  { label: "生成下一步行动（≤30字）", icon: ArrowRight },
]
const GENERAL_ACTIONS = [
  { label: "帮我梳理一个想法", icon: Lightbulb },
  { label: "帮我制定学习计划", icon: ListChecks },
  { label: "帮我拆解一个任务", icon: ClipboardList },
  { label: "给我一些建议", icon: ArrowRight },
]

function generateId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6) }

function WorkbenchContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const cardId = searchParams.get("cardId") || ""
  const from = searchParams.get("from") || ""

  // Card context
  const [card, setCard] = useState<Card | null>(null)
  const [loadingCard, setLoadingCard] = useState(!!cardId)

  // Card library
  const [cards, setCards] = useState<Card[]>([])
  const [categories, setCategories] = useState<CatItem[]>([])
  const [searchQ, setSearchQ] = useState("")
  const [filterCat, setFilterCat] = useState("")
  const [filterStatus, setFilterStatus] = useState("")

  // Chat — loaded from DB per session
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loadingMsgs, setLoadingMsgs] = useState(false)
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const [savedMsgIds, setSavedMsgIds] = useState<Set<string>>(new Set())
  const [thinkingElapsed, setThinkingElapsed] = useState(0)
  const thinkingStartRef = useRef<number>(0)
  const thinkingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const thinkingDurations = useRef<Map<string, number>>(new Map())
  const chatRef = useRef<HTMLDivElement>(null)

  // AI config status
  const [aiConfig, setAiConfig] = useState<{ model: string; reasoning: boolean; strength: string; multiTurn: boolean; contextLimit: number; hasKey: boolean } | null>(null)
  const [lastModel, setLastModel] = useState("")
  const [lastReasoning, setLastReasoning] = useState(false)

  const loadAiConfig = useCallback(async () => {
    try {
      const res = await authFetch("/api/ai/settings")
      if (res.ok) {
        const d = await res.json()
        setAiConfig({
          model: d.model || "deepseek-chat",
          reasoning: d.reasoning_enabled || false,
          strength: d.reasoning_strength || "medium",
          multiTurn: d.multi_turn_enabled ?? true,
          contextLimit: d.context_message_limit || 8,
          hasKey: d.has_api_key || false,
        })
      }
    } catch {}
  }, [])

  useEffect(() => { loadAiConfig() }, [loadAiConfig])
  useEffect(() => {
    window.addEventListener("ai-settings-updated", loadAiConfig)
    return () => window.removeEventListener("ai-settings-updated", loadAiConfig)
  }, [loadAiConfig])

  // Track current session key to detect changes
  const sessionKey = cardId ? `card:${cardId}` : "general"
  const prevKeyRef = useRef(sessionKey)

  // Load card by id
  const fetchCard = useCallback(async () => {
    if (!cardId) { setCard(null); setLoadingCard(false); return }
    setLoadingCard(true)
    try {
      const res = await authFetch(`/api/cards/${cardId}`)
      if (res.ok) setCard(await res.json()); else setCard(null)
    } catch { setCard(null) }
    finally { setLoadingCard(false) }
  }, [cardId])

  // Load all cards + categories for library mode
  const fetchLibrary = useCallback(async () => {
    try {
      const [cardsRes, catRes] = await Promise.all([authFetch("/api/cards"), authFetch("/api/categories")])
      if (cardsRes.ok) setCards(await cardsRes.json())
      if (catRes.ok) setCategories(await catRes.json())
    } catch {}
  }, [])

  // Load chat session messages from DB
  const loadChatSession = useCallback(async () => {
    setLoadingMsgs(true)
    setMessages([])
    try {
      const url = cardId ? `/api/ai/chat-session?cardId=${cardId}` : "/api/ai/chat-session"
      const res = await authFetch(url)
      if (res.ok) {
        const data = await res.json()
        setMessages(data.messages ?? [])
      }
    } catch (err) { console.error("Load chat session failed:", err) }
    finally { setLoadingMsgs(false) }
  }, [cardId])

  useEffect(() => { fetchCard() }, [fetchCard])
  useEffect(() => {
    if (!cardId) { setLoadLibrary(true); fetchLibrary() }
    else { setLoadLibrary(false) }
  }, [cardId, fetchLibrary])
  const [loadLibrary, setLoadLibrary] = useState(false)

  // Load chat session when session key changes
  useEffect(() => {
    if (prevKeyRef.current !== sessionKey) {
      prevKeyRef.current = sessionKey
      loadChatSession()
    }
  }, [sessionKey, loadChatSession])

  // Initial chat load
  useEffect(() => { loadChatSession() }, [loadChatSession])

  // Refresh cards + categories on events
  useEffect(() => {
    const h = () => { if (!cardId) fetchLibrary() }
    window.addEventListener("cards-updated", h)
    window.addEventListener("categories-updated", h)
    return () => { window.removeEventListener("cards-updated", h); window.removeEventListener("categories-updated", h) }
  }, [cardId, fetchLibrary])

  const selectCard = (id: string) => {
    router.replace(`/workbench?cardId=${id}&from=workbench`)
  }

  const clearCard = () => {
    if (from && from !== "workbench") {
      router.replace(`/${from === "home" ? "" : from}`)
    } else {
      router.replace("/workbench")
    }
  }

  // Send message via API (API saves to DB + returns updated messages)
  // Start/stop thinking timer
  const startThinking = () => {
    thinkingStartRef.current = Date.now()
    setThinkingElapsed(0)
    thinkingTimerRef.current = setInterval(() => {
      setThinkingElapsed(Math.floor((Date.now() - thinkingStartRef.current) / 1000))
    }, 1000)
  }
  const stopThinking = () => {
    if (thinkingTimerRef.current) { clearInterval(thinkingTimerRef.current); thinkingTimerRef.current = null }
    const duration = Math.floor((Date.now() - thinkingStartRef.current) / 1000)
    setThinkingElapsed(0)
    return duration
  }

  const sendMessage = async (text: string) => {
    if (!text.trim()) return
    const currentCardId = cardId || undefined
    const aiPlaceholderId = generateId()
    setSending(true)
    startThinking()

    // Append placeholder assistant message
    setMessages((prev) => [...prev, { id: aiPlaceholderId, role: "assistant", content: "" }])
    setTimeout(() => chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" }), 100)

    try {
      // Get token for auth
      const { data: sessionData } = await getBrowserClient().auth.getSession()
      const token = sessionData.session?.access_token || ""

      const res = await fetch("/api/ai/workbench-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ cardId: currentCardId, message: text }),
      })

      if (!res.ok) {
        stopThinking()
        const errText = await res.text().catch(() => "Unknown error")
        setMessages((prev) => prev.map((m) => m.id === aiPlaceholderId ? { ...m, content: `❌ ${errText.slice(0, 100)}` } : m))
        setSending(false)
        return
      }

      // Read SSE stream
      const reader = res.body?.getReader()
      if (!reader) { setSending(false); return }
      const decoder = new TextDecoder()
      let buffer = ""
      let accContent = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() || ""

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed || !trimmed.startsWith("data: ")) continue
          const dataStr = trimmed.slice(6)
          try {
            const data = JSON.parse(dataStr)
            if (data.type === "token") {
              accContent += data.content
              // Update the placeholder message with accumulating content
              setMessages((prev) => prev.map((m) => m.id === aiPlaceholderId ? { ...m, content: accContent } : m))
              setTimeout(() => chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" }), 50)
            } else if (data.type === "done") {
              const duration = stopThinking()
              const finalId = data.messageId || aiPlaceholderId
              const meta = { ttftMs: data.ttftMs, totalMs: data.totalMs, model: data.model }
              setMessages((prev) => prev.map((m) =>
                m.id === aiPlaceholderId ? { ...m, id: finalId, content: accContent, metadata: meta } : m
              ))
              thinkingDurations.current.set(finalId, duration)
              if (data.model) setLastModel(data.model)
              setLastReasoning(data.reasoning || false)
            } else if (data.type === "error") {
              stopThinking()
              setMessages((prev) => prev.map((m) => m.id === aiPlaceholderId ? { ...m, content: `❌ ${data.message}` } : m))
            }
          } catch {}
        }
      }
    } catch (err: any) {
      stopThinking()
      setMessages((prev) => prev.map((m) => m.id === aiPlaceholderId ? { ...m, content: `❌ ${err.message || "请求失败"}` } : m))
    } finally {
      setSending(false)
    }
  }

  const handleSend = async () => {
    const text = input.trim()
    if (!text) return
    setInput("")
    // Optimistic user message
    setMessages((prev) => [...prev, { id: generateId(), role: "user", content: text }])
    setTimeout(() => chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" }), 100)
    await sendMessage(text)
  }

  const handleQuickAction = async (label: string) => {
    setMessages((prev) => [...prev, { id: generateId(), role: "user", content: label }])
    setTimeout(() => chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" }), 100)
    await sendMessage(label)
  }

  useEffect(() => { chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" }) }, [messages.length])

  // Save plan
  const handleSaveAsPlan = async (msgId: string, text: string) => {
    if (!cardId) return
    try {
      const summary = text.replace(/\n/g, " ").slice(0, 50)
      const firstLine = text.split("\n")[0].slice(0, 30)
      await authFetch(`/api/cards/${cardId}/ai-plans`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: firstLine, summary, content: text }),
      })
      setSavedMsgIds((prev) => new Set(prev).add(msgId))
      window.dispatchEvent(new Event("ai-plans-updated"))
      window.dispatchEvent(new Event("cards-updated"))
      toast.success("已保存为新方案，可在卡片详情页查看", {
        action: { label: "查看详情", onClick: () => window.open(`/cards/${cardId}?from=workbench`, "_blank") },
      })
    } catch { toast.error("保存失败") }
  }

  // Save next action
  const handleSaveNextAction = async (text: string) => {
    if (!cardId) return
    const action = text.length > 100 ? text.split(/[。.\n]/).slice(0, 2).join("。").slice(0, 100) : text.slice(0, 100)
    try {
      await authFetch(`/api/cards/${cardId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nextAction: action }) })
      window.dispatchEvent(new Event("cards-updated"))
      toast.success("已保存为下一步行动")
    } catch { toast.error("保存失败") }
  }

  // Filter cards for library
  const filteredCards = cards.filter((c) => {
    if (searchQ) { const q = searchQ.toLowerCase(); if (!c.title?.toLowerCase().includes(q) && !c.note?.toLowerCase().includes(q) && !c.summary?.toLowerCase().includes(q)) return false }
    if (filterCat && filterCat !== "__uncat__" && c.category !== filterCat) return false
    if (filterCat === "__uncat__" && c.category?.trim()) return false
    if (filterStatus && c.status !== filterStatus) return false
    return true
  }).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())

  const hasImages = (card?.images?.length || 0) > 0 || !!card?.imageUrl

  return (
    <ProtectedPage>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><Sparkles className="h-6 w-6" />工作台</h1>
            <p className="text-muted-foreground mt-1">让 AI 帮你把 idea 变成可执行方案</p>
          </div>
          <div className="flex gap-2">
            {cardId && (
              <Link href={`/cards/${cardId}?from=${from || "workbench"}`}>
                <Button variant="outline" size="sm" className="gap-1"><ArrowLeft className="h-3.5 w-3.5" />返回卡片详情</Button>
              </Link>
            )}
          </div>
        </div>

        <div className="flex gap-6 h-[calc(100vh-14rem)]">
          {/* ===== LEFT ===== */}
          <div className="w-[40%] shrink-0 overflow-y-auto rounded-2xl border bg-card p-5 space-y-3">
            {cardId ? (
              loadingCard ? (
                <div className="flex items-center justify-center h-40 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mr-2" />加载卡片...</div>
              ) : card ? (
                <>
                  <button onClick={clearCard} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"><ArrowLeft className="h-3 w-3" />
                    {from === "board" ? "返回看板" : from === "inbox" ? "返回收集箱" : from === "library" ? "返回资料库" : from === "home" ? "返回首页" : "返回卡片列表"}
                  </button>
                  <h2 className="text-lg font-bold">{card.title || "未命名卡片"}</h2>
                  <div className="flex items-center gap-2 flex-wrap">
                    {card.category ? <Badge className={cn(getCategoryColorClass("gray"))}>{card.category}</Badge> : <Badge variant="outline" className="text-muted-foreground">未分类</Badge>}
                    <Badge variant="secondary">{CARD_STATUS_LABELS[card.status]}</Badge>
                  </div>
                  {hasImages && card.images?.map((url, i) => (
                    <div key={i} className="rounded-xl overflow-hidden border bg-muted"><img src={url} alt="" className="w-full max-h-40 object-contain" /></div>
                  ))}
                  {card.note && <div className="p-3 rounded-xl bg-muted/50"><p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><FileText className="h-3 w-3" />原始内容</p><p className="text-sm whitespace-pre-wrap leading-relaxed line-clamp-6">{card.note}</p></div>}
                  {card.summary && !card.note && <p className="text-sm text-muted-foreground line-clamp-6">{card.summary}</p>}
                  <div className="text-xs text-muted-foreground pt-2 border-t space-y-0.5">
                    <p>创建：{new Date(card.createdAt).toLocaleString("zh-CN")}</p>
                    <p>更新：{new Date(card.updatedAt).toLocaleString("zh-CN")}</p>
                  </div>
                  <Link href={`/cards/${card.id}?from=${from || "workbench"}`}><Button variant="outline" size="sm" className="w-full mt-2">打开完整详情页</Button></Link>
                </>
              ) : <p className="text-sm text-muted-foreground text-center py-8">卡片不存在</p>
            ) : (
              <>
                <h2 className="text-base font-semibold">卡片库</h2>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input value={searchQ} onChange={(e) => setSearchQ(e.target.value)} placeholder="搜索标题或内容..." className="pl-8 h-8 text-sm" />
                  {searchQ && <button onClick={() => setSearchQ("")} className="absolute right-2 top-1/2 -translate-y-1/2"><X className="h-3.5 w-3.5 text-muted-foreground" /></button>}
                </div>
                <div className="flex gap-1 flex-wrap">
                  <Badge variant={filterCat === "" ? "default" : "outline"} className="cursor-pointer text-[10px]" onClick={() => setFilterCat("")}>全部分类</Badge>
                  <Badge variant={filterCat === "__uncat__" ? "default" : "outline"} className="cursor-pointer text-[10px]" onClick={() => setFilterCat("__uncat__")}>未分类</Badge>
                  {categories.map((c) => (
                    <Badge key={c.id} variant={filterCat === c.name ? "default" : "outline"} className={cn("cursor-pointer text-[10px]", getCategoryColorClass(c.color))} onClick={() => setFilterCat(filterCat === c.name ? "" : c.name)}>{c.name}</Badge>
                  ))}
                </div>
                <div className="flex gap-1 flex-wrap">
                  <Badge variant={filterStatus === "" ? "default" : "outline"} className="cursor-pointer text-[10px]" onClick={() => setFilterStatus("")}>全部状态</Badge>
                  {ALL_STATUSES.map((s) => (
                    <Badge key={s} variant={filterStatus === s ? "default" : "outline"} className="cursor-pointer text-[10px]" onClick={() => setFilterStatus(s)}>{CARD_STATUS_LABELS[s]}</Badge>
                  ))}
                </div>
                <div className="space-y-1.5">
                  {filteredCards.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">暂无匹配卡片</p>
                  ) : (
                    filteredCards.map((c) => (
                      <button key={c.id} onClick={() => selectCard(c.id)}
                        className="w-full text-left p-2.5 rounded-lg border hover:bg-accent transition-colors">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{c.title || "未命名"}</p>
                            <div className="flex items-center gap-1 mt-1 flex-wrap">
                              {c.category && <Badge variant="outline" className={cn("text-[10px] px-1 py-0", getCategoryColorClass(c.category))}>{c.category}</Badge>}
                              <span className="text-[10px] text-muted-foreground">{CARD_STATUS_LABELS[c.status]}</span>
                              <span className="text-[10px] text-muted-foreground/60">{new Date(c.updatedAt).toLocaleDateString("zh-CN")}</span>
                            </div>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </>
            )}
          </div>

          {/* ===== RIGHT: AI Chat ===== */}
          <div className="flex-1 min-w-0 flex flex-col rounded-2xl border bg-card overflow-hidden">
            {/* Mode indicator + config */}
            <div className="px-4 py-2 border-b">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant={cardId ? "default" : "outline"} className="text-[10px] gap-1">
                  <Sparkles className="h-3 w-3" />
                  {cardId ? `卡片问答：${card?.title?.slice(0, 12) || "..."}` : "通用问答"}
                </Badge>
                {aiConfig && (
                  <>
                    <span className="text-[10px] text-muted-foreground">{lastModel || aiConfig.model}</span>
                    <span className="text-[10px] text-muted-foreground">思考：{lastReasoning ? aiConfig.strength : "关闭"}</span>
                    <span className="text-[10px] text-muted-foreground">多轮：{aiConfig.multiTurn ? `${aiConfig.contextLimit}条` : "关闭"}</span>
                  </>
                )}
                <Link href="/settings/app" className="text-[10px] text-muted-foreground hover:text-foreground ml-auto">AI 设置</Link>
              </div>
              {aiConfig && !aiConfig.hasKey && (
                <div className="mt-1.5 flex items-center gap-2 text-[10px] text-amber-600">
                  <span>尚未配置 AI API Key</span>
                  <Link href="/settings/app"><Button variant="link" size="sm" className="h-5 text-[10px] p-0">去配置</Button></Link>
                </div>
              )}
            </div>
            <div ref={chatRef} className="flex-1 overflow-y-auto p-4 space-y-3">
              {loadingMsgs ? (
                <div className="flex items-center justify-center h-full text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mr-2" />加载对话记录...</div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-3">
                  <Sparkles className="h-10 w-10 text-muted-foreground/30" />
                  <div>
                    <p className="text-sm font-medium">{cardId ? "AI 对话窗口" : "通用 AI 问答"}</p>
                    <p className="text-xs text-muted-foreground mt-1">{cardId ? "基于当前卡片，点击快捷按钮或输入问题" : "直接输入问题，或点击快捷按钮开始"}</p>
                  </div>
                </div>
              ) : (
                messages.map((m) => (
                  <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                    <div>
                      <div className={cn("max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap", m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted")}>{m.content}</div>
                      {m.role === "assistant" && m.metadata?.ttftMs != null && (
                        <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                          首字 {m.metadata.ttftMs < 1000 ? `${m.metadata.ttftMs}ms` : `${(m.metadata.ttftMs / 1000).toFixed(1)}s`} · 总耗时 {m.metadata.totalMs != null ? (m.metadata.totalMs < 1000 ? `${m.metadata.totalMs}ms` : `${(m.metadata.totalMs / 1000).toFixed(1)}s`) : "-"}
                        </p>
                      )}
                      {m.role === "assistant" && (
                        <div className="flex gap-2 mt-1">
                          <button onClick={() => handleSaveAsPlan(m.id, m.content)} disabled={savedMsgIds.has(m.id)}
                            className={cn("text-xs flex items-center gap-1 px-1.5 py-0.5 rounded", savedMsgIds.has(m.id) ? "text-green-600" : "text-muted-foreground hover:text-foreground")}>
                            {savedMsgIds.has(m.id) ? <><Check className="h-3 w-3" />已保存</> : <><Bookmark className="h-3 w-3" />保存为方案</>}
                          </button>
                          <button onClick={() => handleSaveNextAction(m.content)}
                            className="text-xs flex items-center gap-1 px-1.5 py-0.5 rounded text-muted-foreground hover:text-foreground">
                            <ArrowRight className="h-3 w-3" />保存为下一步行动
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
              {sending && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-2xl px-4 py-3 text-sm space-y-1.5 min-w-[180px]">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>正在思考</span>
                    </div>
                    <p className="text-xs text-muted-foreground/70">AI 正在整理回答…</p>
                    <p className="text-xs text-muted-foreground/50">{thinkingElapsed} 秒</p>
                  </div>
                </div>
              )}
            </div>
            <div className="px-4 py-2 border-t flex gap-2 overflow-x-auto">
              {(cardId ? CARD_ACTIONS : GENERAL_ACTIONS).map((a) => (
                <Button key={a.label} variant="outline" size="sm" className="gap-1 shrink-0" onClick={() => handleQuickAction(a.label)}><a.icon className="h-3.5 w-3.5" />{a.label}</Button>
              ))}
            </div>
            <div className="px-4 py-3 border-t flex gap-2">
              <Input value={input} onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                placeholder={cardId ? "输入消息..." : "输入消息，AI 帮你分析..."} className="flex-1" />
              <Button size="icon" onClick={handleSend} disabled={!input.trim() || sending}><Send className="h-4 w-4" /></Button>
            </div>
          </div>
        </div>
      </div>
    </ProtectedPage>
  )
}

export default function WorkbenchPage() {
  return <Suspense><WorkbenchContent /></Suspense>
}
