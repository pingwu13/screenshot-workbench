"use client"

import { Suspense, useCallback, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card } from "@/types/card"
import { ProtectedPage } from "@/components/layout/protected-page"
import { authFetch } from "@/lib/api-client"
import { getCategoryColorClass } from "@/lib/category-colors"
import { useI18n } from "@/i18n/context"
import { CARD_STATUS_LABELS } from "@/types/card"
import Link from "next/link"
import { ArrowRight, Inbox, LayoutGrid, Library, Lightbulb, Plus, Play, Target, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

type ListType = "inProgress" | "pending" | "all" | null
let cardsCache: Card[] | null = null

function CardListDialog({ open, onClose, title, cards, loading }: {
  open: boolean; onClose: () => void; title: string; cards: Card[]; loading: boolean
}) {
  const router = useRouter()
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[70vh] flex flex-col">
        <DialogHeader><DialogTitle>{title}（{cards.length}）</DialogTitle></DialogHeader>
        <div className="flex-1 overflow-y-auto space-y-1 -mx-2 px-2">
          {loading && cards.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">加载中...</p>
          ) : cards.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">暂无卡片</p>
          ) : (
            cards.map((c) => (
              <button key={c.id} onClick={() => router.push(`/cards/${c.id}`)}
                className="w-full text-left flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-accent transition-colors">
                <span className="text-sm font-medium truncate flex-1 min-w-0 mr-4">{c.title || "未命名卡片"}</span>
                <span className="text-xs text-muted-foreground shrink-0 text-right">
                  创建 {new Date(c.createdAt).toLocaleDateString("zh-CN")} · 更新 {new Date(c.updatedAt).toLocaleString("zh-CN")}
                </span>
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function CompactCard({ card }: { card: Card }) {
  return (
    <div className="p-3 rounded-xl border bg-card hover:shadow-sm transition-shadow group">
      <div className="flex items-start justify-between gap-2">
        <Link href={`/cards/${card.id}?from=home`} className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate hover:underline">{card.title || "未命名卡片"}</p>
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            {card.category ? (
              <Badge variant="outline" className={cn("text-[10px] px-1 py-0", getCategoryColorClass(card.category))}>{card.category}</Badge>
            ) : (
              <span className="text-[10px] text-muted-foreground">未分类</span>
            )}
            <span className="text-[10px] text-muted-foreground">{CARD_STATUS_LABELS[card.status]}</span>
            <span className="text-[10px] text-muted-foreground/60">{new Date(card.updatedAt).toLocaleDateString("zh-CN")}</span>
          </div>
          {card.nextAction && (
            <p className="text-[10px] text-muted-foreground mt-1 truncate">▶ {card.nextAction}</p>
          )}
        </Link>
        <Link href={`/workbench?cardId=${card.id}&from=home`} className="shrink-0 mt-0.5">
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1"><Sparkles className="h-3 w-3" />进入工作台</Button>
        </Link>
      </div>
    </div>
  )
}

function HomePageContent() {
  const { t } = useI18n()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [cards, setCards] = useState<Card[]>(cardsCache || [])
  const [loading, setLoading] = useState(!cardsCache)

  const listType = (searchParams.get("list") as ListType) || null
  const openList = (type: ListType) => router.push(`/?list=${type}`, { scroll: false })
  const closeList = () => router.push("/", { scroll: false })

  const fetchCards = useCallback(async () => {
    try {
      const res = await authFetch("/api/cards")
      if (!res.ok) return
      const data = await res.json()
      const list = Array.isArray(data) ? data : []
      cardsCache = list
      setCards(list)
    } catch (err) { console.error("[HomePage] fetch error:", err) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    if (cardsCache) { setCards(cardsCache); setLoading(false) }
    fetchCards()
    window.addEventListener("cards-updated", fetchCards)
    return () => window.removeEventListener("cards-updated", fetchCards)
  }, [fetchCards])

  const doing = cards.filter((c) => c.status === "doing")
  const planned = cards.filter((c) => c.status === "planned")
  const inboxCards = cards.filter((c) => c.status === "inbox")
  const focusCard = doing[0] || planned[0] || inboxCards[0] || null

  const listCards = listType === "inProgress" ? doing
    : listType === "pending" ? inboxCards
    : listType === "all" ? cards : []
  const listTitle = listType === "inProgress" ? t.home.inProgress
    : listType === "pending" ? t.home.pending
    : listType === "all" ? t.home.total : ""

  return (
    <ProtectedPage>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t.home.greeting}</h1>
          <p className="text-muted-foreground mt-1">看看今天需要推进什么</p>
        </div>

        {/* Top: Stats || Today's Focus */}
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
          {/* Left: Stats */}
          <div className="rounded-2xl border bg-card p-5 space-y-4">
            <h3 className="text-sm font-semibold">统计概览</h3>
            <button onClick={() => openList("inProgress")} className="flex items-center gap-4 w-full text-left hover:bg-muted/50 rounded-lg p-2 -mx-2 transition-colors">
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0"><Play className="h-4 w-4 text-primary" /></div>
              <div className="flex-1 min-w-0"><p className="text-sm">进行中</p><p className="text-[10px] text-muted-foreground">正在推进的任务</p></div>
              <span className="text-2xl font-bold">{doing.length}</span>
            </button>
            <button onClick={() => openList("pending")} className="flex items-center gap-4 w-full text-left hover:bg-muted/50 rounded-lg p-2 -mx-2 transition-colors">
              <div className="h-9 w-9 rounded-full bg-amber-100 flex items-center justify-center shrink-0"><Inbox className="h-4 w-4 text-amber-600" /></div>
              <div className="flex-1 min-w-0"><p className="text-sm">待处理</p><p className="text-[10px] text-muted-foreground">还在收集箱中的 idea</p></div>
              <span className="text-2xl font-bold">{inboxCards.length}</span>
            </button>
            <button onClick={() => openList("all")} className="flex items-center gap-4 w-full text-left hover:bg-muted/50 rounded-lg p-2 -mx-2 transition-colors">
              <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center shrink-0"><Library className="h-4 w-4" /></div>
              <div className="flex-1 min-w-0"><p className="text-sm">全部卡片</p><p className="text-[10px] text-muted-foreground">累计收集内容</p></div>
              <span className="text-2xl font-bold">{cards.length}</span>
            </button>
          </div>

          {/* Right: Today's Focus */}
          <div className="rounded-2xl border bg-card p-5 flex flex-col">
            <div className="flex items-center gap-2 mb-4">
              <Target className="h-5 w-5" />
              <h3 className="text-sm font-semibold">今日重点</h3>
            </div>
            {focusCard ? (
              <div className="flex-1 flex flex-col">
                <Link href={`/cards/${focusCard.id}?from=home`} className="flex-1 min-w-0">
                  <h4 className="text-lg font-bold hover:underline">{focusCard.title || "未命名卡片"}</h4>
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    {focusCard.category ? (
                      <Badge variant="outline" className={cn("text-[10px] px-1 py-0", getCategoryColorClass(focusCard.category))}>{focusCard.category}</Badge>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">未分类</span>
                    )}
                    <span className="text-[10px] text-muted-foreground">{CARD_STATUS_LABELS[focusCard.status]}</span>
                    <span className="text-[10px] text-muted-foreground/60">{new Date(focusCard.updatedAt).toLocaleDateString("zh-CN")}</span>
                  </div>
                  {focusCard.nextAction ? (
                    <p className="text-sm mt-3 text-muted-foreground">下一步：{focusCard.nextAction}</p>
                  ) : focusCard.aiSummary ? (
                    <p className="text-xs mt-3 text-muted-foreground line-clamp-2">{focusCard.aiSummary}</p>
                  ) : (
                    <p className="text-xs mt-3 text-muted-foreground/60">进入工作台生成处理方案</p>
                  )}
                </Link>
                <div className="mt-auto pt-3">
                  <Link href={`/workbench?cardId=${focusCard.id}&from=home`}>
                    <Button className="gap-1.5"><Sparkles className="h-4 w-4" />进入工作台</Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <Lightbulb className="h-8 w-8 text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">暂无重点任务</p>
                <p className="text-xs text-muted-foreground/60 mt-1">从收集箱挑选一个 idea 开始处理</p>
                <Link href="/inbox"><Button variant="link" size="sm" className="mt-2">查看收集箱</Button></Link>
              </div>
            )}
          </div>
        </div>

        <CardListDialog open={listType !== null} onClose={closeList} title={listTitle} cards={listCards} loading={loading} />

        {/* Pending Inbox */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2"><Inbox className="h-5 w-5" /><h2 className="text-lg font-semibold">待处理收集箱</h2></div>
            <Link href="/inbox"><Button variant="ghost" size="sm" className="gap-1">全部<ArrowRight className="h-3 w-3" /></Button></Link>
          </div>
          {inboxCards.length === 0 ? (
            <div className="text-center py-8 rounded-xl border bg-card"><p className="text-sm text-muted-foreground">收集箱为空</p><p className="text-xs text-muted-foreground/60 mt-1">所有 idea 都已分类处理</p></div>
          ) : (
            <div className="space-y-2">
              {inboxCards.slice(0, 5).map((c) => (<CompactCard key={c.id} card={c} />))}
              {inboxCards.length > 5 && <p className="text-center text-xs text-muted-foreground">还有 {inboxCards.length - 5} 张卡片在收集箱</p>}
            </div>
          )}
        </div>

        {/* In Progress */}
        {doing.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2"><Play className="h-5 w-5" /><h2 className="text-lg font-semibold">进行中</h2></div>
              <Link href="/board"><Button variant="ghost" size="sm" className="gap-1">看板<ArrowRight className="h-3 w-3" /></Button></Link>
            </div>
            <div className="space-y-2">{doing.map((c) => (<CompactCard key={c.id} card={c} />))}</div>
          </div>
        )}

        {/* Quick Actions */}
        <div>
          <h2 className="text-lg font-semibold mb-3">快捷操作</h2>
          <div className="flex gap-2 flex-wrap">
            <Link href="/cards/new"><Button className="gap-1.5"><Plus className="h-4 w-4" />新建卡片</Button></Link>
            <Link href="/inbox"><Button variant="outline" className="gap-1.5"><Inbox className="h-4 w-4" />收集箱 ({inboxCards.length})</Button></Link>
            <Link href="/board"><Button variant="outline" className="gap-1.5"><LayoutGrid className="h-4 w-4" />看板</Button></Link>
            <Link href="/library"><Button variant="outline" className="gap-1.5"><Library className="h-4 w-4" />资料库</Button></Link>
          </div>
        </div>
      </div>
    </ProtectedPage>
  )
}

export default function HomePage() {
  return <Suspense><HomePageContent /></Suspense>
}
