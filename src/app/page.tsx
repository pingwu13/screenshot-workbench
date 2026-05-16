"use client"

import { Suspense, useCallback, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card } from "@/types/card"
import { CardItem } from "@/components/cards/card-item"
import { ProtectedPage } from "@/components/layout/protected-page"
import { authFetch } from "@/lib/api-client"
import { useI18n } from "@/i18n/context"
import Link from "next/link"
import { ArrowRight, ClipboardList } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"

type ListType = "inProgress" | "pending" | "all" | null

// Module-level cache: survive navigation, show instantly on return
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
                className="w-full text-left flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-accent transition-colors"
              >
                <span className="text-sm font-medium truncate flex-1 min-w-0 mr-4">{c.title || "未命名卡片"}</span>
                <span className="text-xs text-muted-foreground shrink-0 text-right">
                  <span>创建 {new Date(c.createdAt).toLocaleDateString("zh-CN")}</span>
                  <span className="mx-1.5 text-muted-foreground/40">·</span>
                  <span>更新 {new Date(c.updatedAt).toLocaleString("zh-CN")}</span>
                </span>
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function HomePageContent() {
  const { t } = useI18n()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [cards, setCards] = useState<Card[]>(cardsCache || [])
  const [loading, setLoading] = useState(!cardsCache)

  // Use URL search param to persist dialog state across navigation
  const listType = (searchParams.get("list") as ListType) || null

  const openList = (type: ListType) => router.push(`/?list=${type}`, { scroll: false })
  const closeList = () => router.push("/", { scroll: false })

  const fetchCards = useCallback(async () => {
    try {
      const res = await authFetch("/api/cards")
      if (!res.ok) { console.error("[HomePage] fetch cards failed:", res.status); return }
      const data = await res.json()
      const list = Array.isArray(data) ? data : []
      cardsCache = list
      setCards(list)
    } catch (err) {
      console.error("[HomePage] fetch cards exception:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (cardsCache) {
      setCards(cardsCache)
      setLoading(false)
    }
    fetchCards()
    window.addEventListener("cards-updated", fetchCards)
    return () => window.removeEventListener("cards-updated", fetchCards)
  }, [fetchCards])

  const unfinishedTodos = cards.filter((c) => c.type === "todo" && ["planned", "doing"].includes(c.status))
  const inProgress = cards.filter((c) => c.status === "doing")
  const inboxCards = cards.filter((c) => c.status === "inbox")
  const pendingCards = inboxCards

  const listCards = listType === "inProgress" ? inProgress
    : listType === "pending" ? pendingCards
    : listType === "all" ? cards
    : []

  const listTitle = listType === "inProgress" ? t.home.inProgress
    : listType === "pending" ? t.home.pending
    : listType === "all" ? t.home.total
    : ""

  return (
    <ProtectedPage>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t.home.greeting}</h1>
          <p className="text-muted-foreground mt-1">{t.home.subtitle}</p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <button onClick={() => openList("inProgress")}
            className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow text-left cursor-pointer">
            <p className="text-2xl font-bold">{inProgress.length}</p>
            <p className="text-sm text-muted-foreground">{t.home.inProgress}</p>
          </button>
          <button onClick={() => openList("pending")}
            className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow text-left cursor-pointer">
            <p className="text-2xl font-bold">{pendingCards.length}</p>
            <p className="text-sm text-muted-foreground">{t.home.pending}</p>
          </button>
          <button onClick={() => openList("all")}
            className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow text-left cursor-pointer">
            <p className="text-2xl font-bold">{cards.length}</p>
            <p className="text-sm text-muted-foreground">{t.home.total}</p>
          </button>
        </div>

        <CardListDialog open={listType !== null} onClose={closeList}
          title={listTitle} cards={listCards} loading={loading} />

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              {t.home.unfinishedTodos}
            </h2>
            <Link href="/board">
              <Button variant="ghost" size="sm" className="gap-1">
                {t.home.boardView}
                <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>

          {unfinishedTodos.length === 0 ? (
            <div className="text-center py-12 border rounded-lg bg-muted/30">
              <p className="text-muted-foreground">{t.home.noUnfinished}</p>
              <Link href="/cards/new">
                <Button variant="link" size="sm">{t.home.createCard}</Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {unfinishedTodos.map((card) => (
                <CardItem key={card.id} card={card} from="home" />
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <Link href="/inbox">
            <Button variant="outline" size="sm">
              {t.home.organizeInbox} ({pendingCards.length})
            </Button>
          </Link>
          <Link href="/library">
            <Button variant="outline" size="sm">{t.home.browseLibrary}</Button>
          </Link>
        </div>
      </div>
    </ProtectedPage>
  )
}

export default function HomePage() {
  return (
    <Suspense>
      <HomePageContent />
    </Suspense>
  )
}
