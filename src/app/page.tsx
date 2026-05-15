"use client"

import { useCallback, useEffect, useState } from "react"
import { Card } from "@/types/card"
import { CardItem } from "@/components/cards/card-item"
import { ProtectedPage } from "@/components/layout/protected-page"
import { authFetch } from "@/lib/api-client"
import { useI18n } from "@/i18n/context"
import Link from "next/link"
import { ArrowRight, ClipboardList } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function HomePage() {
  const { t } = useI18n()
  const [cards, setCards] = useState<Card[]>([])

  const fetchCards = useCallback(async () => {
    try {
      const res = await authFetch("/api/cards")
      if (!res.ok) { console.error("[HomePage] fetch cards failed:", res.status); setCards([]); return }
      const data = await res.json()
      setCards(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error("[HomePage] fetch cards exception:", err)
      setCards([])
    }
  }, [])

  useEffect(() => {
    fetchCards()
  }, [fetchCards])

  const unfinishedTodos = cards.filter(
    (c) => c.type === "todo" && ["planned", "doing"].includes(c.status)
  )
  const inProgress = cards.filter((c) => c.status === "doing")
  const inboxCount = cards.filter((c) => c.status === "inbox").length

  return (
    <ProtectedPage>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t.home.greeting}</h1>
          <p className="text-muted-foreground mt-1">{t.home.subtitle}</p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 rounded-lg border bg-card">
            <p className="text-2xl font-bold">{inProgress.length}</p>
            <p className="text-sm text-muted-foreground">{t.home.inProgress}</p>
          </div>
          <div className="p-4 rounded-lg border bg-card">
            <p className="text-2xl font-bold">{inboxCount}</p>
            <p className="text-sm text-muted-foreground">{t.home.pending}</p>
          </div>
          <div className="p-4 rounded-lg border bg-card">
            <p className="text-2xl font-bold">{cards.length}</p>
            <p className="text-sm text-muted-foreground">{t.home.total}</p>
          </div>
        </div>

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
                <CardItem key={card.id} card={card} />
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <Link href="/inbox">
            <Button variant="outline" size="sm">
              {t.home.organizeInbox} ({inboxCount})
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
