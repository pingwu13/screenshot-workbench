"use client"

import { Suspense, useCallback, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card } from "@/types/card"
import { QuickNoteInput } from "@/components/cards/quick-note-input"
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
import { cn, CLICKABLE_CARD } from "@/lib/utils"

type ListType = "inProgress" | "pending" | "all" | null
let cardsCache: Card[] | null = null

function CardListDialog({ open, onClose, title, cards, loading, locale }: {
  open: boolean; onClose: () => void; title: string; cards: Card[]; loading: boolean; locale: string
}) {
  const router = useRouter()
  const { t } = useI18n()
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[70vh] flex flex-col">
        <DialogHeader><DialogTitle>{title}（{cards.length}）</DialogTitle></DialogHeader>
        <div className="flex-1 overflow-y-auto space-y-1 -mx-2 px-2">
          {loading && cards.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">{t.common.loading}</p>
          ) : cards.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">{t.noCards}</p>
          ) : (
            cards.map((c) => (
              <button key={c.id} onClick={() => router.push(`/cards/${c.id}`)}
                className="w-full text-left flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-accent cursor-pointer transition-colors duration-150">
                <span className="text-sm font-medium truncate flex-1 min-w-0 mr-4">{c.title || t.card.unnamed}</span>
                <span className="text-xs text-muted-foreground shrink-0 text-right">
                  {t.common.create} {new Date(c.createdAt).toLocaleDateString(locale)} · {t.common.update} {new Date(c.updatedAt).toLocaleString(locale)}
                </span>
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function CompactCard({ card, locale, t }: { card: Card; locale: string; t: ReturnType<typeof useI18n>["t"] }) {
  return (
    <div className={cn("p-3 rounded-xl border bg-card", CLICKABLE_CARD)}>
      <div className="flex items-start justify-between gap-2">
        <Link href={`/cards/${card.id}?from=home`} className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{card.title || t.card.unnamed}</p>
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            {card.category ? (
              <Badge variant="outline" className={cn("text-[10px] px-1 py-0", getCategoryColorClass(card.category))}>{card.category}</Badge>
            ) : (
              <span className="text-[10px] text-muted-foreground">{t.common.uncategorized}</span>
            )}
            <span className="text-[10px] text-muted-foreground">{CARD_STATUS_LABELS[card.status]}</span>
            <span className="text-[10px] text-muted-foreground/60">{new Date(card.updatedAt).toLocaleDateString(locale)}</span>
          </div>
          {card.nextAction && (
            <p className="text-[10px] text-muted-foreground mt-1 truncate">{t.card.action}: {card.nextAction}</p>
          )}
        </Link>
        <Link href={`/workbench?cardId=${card.id}&from=home`} className="shrink-0 mt-0.5">
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1"><Sparkles className="h-3 w-3" />{t.home.goWorkbench}</Button>
        </Link>
      </div>
    </div>
  )
}

function HomePageContent() {
  const { t, locale } = useI18n()
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
          <p className="text-muted-foreground mt-1">{t.home.subtitle}</p>
        </div>

        <QuickNoteInput />

        {/* Top: Stats || Today's Focus */}
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
          {/* Left: Stats */}
          <div className="rounded-2xl border bg-card p-5 space-y-4">
            <h3 className="text-sm font-semibold">{t.home.statsOverview}</h3>
            <button onClick={() => openList("inProgress")} className="flex items-center gap-4 w-full text-left hover:bg-muted/50 rounded-lg p-2 -mx-2 transition-colors">
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0"><Play className="h-4 w-4 text-primary" /></div>
              <div className="flex-1 min-w-0"><p className="text-sm">{t.home.inProgress}</p><p className="text-[10px] text-muted-foreground">{t.home.inProgressDesc}</p></div>
              <span className="text-2xl font-bold">{doing.length}</span>
            </button>
            <button onClick={() => openList("pending")} className="flex items-center gap-4 w-full text-left hover:bg-muted/50 rounded-lg p-2 -mx-2 transition-colors">
              <div className="h-9 w-9 rounded-full bg-amber-100 flex items-center justify-center shrink-0"><Inbox className="h-4 w-4 text-amber-600" /></div>
              <div className="flex-1 min-w-0"><p className="text-sm">{t.home.pending}</p><p className="text-[10px] text-muted-foreground">{t.home.pendingDesc}</p></div>
              <span className="text-2xl font-bold">{inboxCards.length}</span>
            </button>
            <button onClick={() => openList("all")} className="flex items-center gap-4 w-full text-left hover:bg-muted/50 rounded-lg p-2 -mx-2 transition-colors">
              <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center shrink-0"><Library className="h-4 w-4" /></div>
              <div className="flex-1 min-w-0"><p className="text-sm">{t.home.total}</p><p className="text-[10px] text-muted-foreground">{t.home.totalCardsDesc}</p></div>
              <span className="text-2xl font-bold">{cards.length}</span>
            </button>
          </div>

          {/* Right: Today's Focus */}
          <div className={cn("rounded-2xl border bg-card p-5 flex flex-col", CLICKABLE_CARD)}>
            <div className="flex items-center gap-2 mb-4">
              <Target className="h-5 w-5" />
              <h3 className="text-sm font-semibold">{t.home.todayFocus}</h3>
            </div>
            {focusCard ? (
              <div className="flex-1 flex flex-col">
                <Link href={`/cards/${focusCard.id}?from=home`} className="flex-1 min-w-0">
                  <h4 className="text-lg font-bold">{focusCard.title || t.card.unnamed}</h4>
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    {focusCard.category ? (
                      <Badge variant="outline" className={cn("text-[10px] px-1 py-0", getCategoryColorClass(focusCard.category))}>{focusCard.category}</Badge>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">{t.common.uncategorized}</span>
                    )}
                    <span className="text-[10px] text-muted-foreground">{CARD_STATUS_LABELS[focusCard.status]}</span>
                    <span className="text-[10px] text-muted-foreground/60">{new Date(focusCard.updatedAt).toLocaleDateString(locale)}</span>
                  </div>
                  {focusCard.nextAction ? (
                    <p className="text-sm mt-3 text-muted-foreground">{t.card.action}: {focusCard.nextAction}</p>
                  ) : focusCard.aiSummary ? (
                    <p className="text-xs mt-3 text-muted-foreground line-clamp-2">{focusCard.aiSummary}</p>
                  ) : (
                    <p className="text-xs mt-3 text-muted-foreground/60">{t.home.goWorkbenchHint}</p>
                  )}
                </Link>
                <div className="mt-auto pt-3">
                  <Link href={`/workbench?cardId=${focusCard.id}&from=home`}>
                    <Button className="gap-1.5"><Sparkles className="h-4 w-4" />{t.home.goWorkbench}</Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <Lightbulb className="h-8 w-8 text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">{t.home.noFocus}</p>
                <p className="text-xs text-muted-foreground/60 mt-1">{t.home.noFocusHint}</p>
                <Link href="/inbox"><Button variant="link" size="sm" className="mt-2">{t.home.viewInbox}</Button></Link>
              </div>
            )}
          </div>
        </div>

        <CardListDialog open={listType !== null} onClose={closeList} title={listTitle} cards={listCards} loading={loading} locale={locale} />

        {/* Pending Inbox */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2"><Inbox className="h-5 w-5" /><h2 className="text-lg font-semibold">{t.home.inboxPreview}</h2></div>
            <Link href="/inbox"><Button variant="ghost" size="sm" className="gap-1">{t.home.viewAll}<ArrowRight className="h-3 w-3" /></Button></Link>
          </div>
          {inboxCards.length === 0 ? (
            <div className="text-center py-8 rounded-xl border bg-card"><p className="text-sm text-muted-foreground">{t.home.inboxEmpty}</p><p className="text-xs text-muted-foreground/60 mt-1">{t.home.inboxEmptyHint}</p></div>
          ) : (
            <div className="space-y-2">
              {inboxCards.slice(0, 5).map((c) => (<CompactCard key={c.id} card={c} locale={locale} t={t} />))}
              {inboxCards.length > 5 && <p className="text-center text-xs text-muted-foreground">{t.home.inboxCount.replace("{n}", String(inboxCards.length - 5))}</p>}
            </div>
          )}
        </div>

        {/* In Progress */}
        {doing.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2"><Play className="h-5 w-5" /><h2 className="text-lg font-semibold">{t.home.doingSection}</h2></div>
              <Link href="/board"><Button variant="ghost" size="sm" className="gap-1">{t.nav.board}<ArrowRight className="h-3 w-3" /></Button></Link>
            </div>
            <div className="space-y-2">{doing.map((c) => (<CompactCard key={c.id} card={c} locale={locale} t={t} />))}</div>
          </div>
        )}

        {/* Quick Actions */}
        <div>
          <h2 className="text-lg font-semibold mb-3">{t.home.quickActions}</h2>
          <div className="flex gap-2 flex-wrap">
            <Link href="/cards/new"><Button className="gap-1.5"><Plus className="h-4 w-4" />{t.nav.newCard}</Button></Link>
            <Link href="/inbox"><Button variant="outline" className="gap-1.5"><Inbox className="h-4 w-4" />{t.nav.inbox} ({inboxCards.length})</Button></Link>
            <Link href="/board"><Button variant="outline" className="gap-1.5"><LayoutGrid className="h-4 w-4" />{t.nav.board}</Button></Link>
            <Link href="/library"><Button variant="outline" className="gap-1.5"><Library className="h-4 w-4" />{t.nav.library}</Button></Link>
          </div>
        </div>
      </div>
    </ProtectedPage>
  )
}

export default function HomePage() {
  return <Suspense><HomePageContent /></Suspense>
}
