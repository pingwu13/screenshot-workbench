"use client"

import { useCallback, useEffect, useState } from "react"
import { Card } from "@/types/card"
import { CardGrid } from "@/components/cards/card-grid"
import { useI18n } from "@/i18n/context"
import { Inbox } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function InboxPage() {
  const { t } = useI18n()
  const [cards, setCards] = useState<Card[]>([])

  const fetchCards = useCallback(async () => {
    const res = await fetch(`/api/cards?status=inbox`)
    setCards(await res.json())
  }, [])

  useEffect(() => {
    fetchCards()
  }, [fetchCards])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Inbox className="h-6 w-6" />
            {t.inbox.title}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t.inbox.subtitle} ({cards.length})
          </p>
        </div>
        <Link href="/cards/new">
          <Button>{t.nav.newCard}</Button>
        </Link>
      </div>

      <CardGrid cards={cards} />
    </div>
  )
}
