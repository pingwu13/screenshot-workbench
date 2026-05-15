"use client"

import { useCallback, useEffect, useState } from "react"
import { Card } from "@/types/card"
import { KanbanBoard } from "@/components/board/kanban-board"
import { ProtectedPage } from "@/components/layout/protected-page"
import { authFetch } from "@/lib/api-client"
import { useI18n } from "@/i18n/context"
import { LayoutGrid } from "lucide-react"

export default function BoardPage() {
  const { t } = useI18n()
  const [cards, setCards] = useState<Card[]>([])

  const fetchCards = useCallback(async () => {
    const res = await authFetch("/api/cards")
    setCards(await res.json())
  }, [])

  useEffect(() => { fetchCards() }, [fetchCards])

  return (
    <ProtectedPage>
      <div className="space-y-6 h-[calc(100vh-6rem)] flex flex-col">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <LayoutGrid className="h-6 w-6" />{t.board.title}
          </h1>
          <p className="text-muted-foreground mt-1">{t.board.subtitle}</p>
        </div>
        <div className="flex-1 overflow-hidden">
          <KanbanBoard initialCards={cards} />
        </div>
      </div>
    </ProtectedPage>
  )
}
