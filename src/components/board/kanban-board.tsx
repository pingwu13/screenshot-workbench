"use client"

import { useCallback, useEffect, useState } from "react"
import { Card, CardStatus, CARD_STATUS_ORDER } from "@/types/card"
import { KanbanColumn } from "@/components/board/kanban-column"
import { authFetch } from "@/lib/api-client"
import { useI18n } from "@/i18n/context"
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import { toast } from "sonner"

interface KanbanBoardProps {
  initialCards: Card[]
}

export function KanbanBoard({ initialCards }: KanbanBoardProps) {
  const { t } = useI18n()
  const [cards, setCards] = useState<Card[]>(initialCards)
  const [optimisticCards, setOptimisticCards] = useState<Card[]>(initialCards)

  useEffect(() => {
    setCards(initialCards)
    setOptimisticCards(initialCards)
  }, [initialCards])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  )

  const getCardsByStatus = useCallback(
    (status: CardStatus) =>
      optimisticCards.filter((c) => c.status === status),
    [optimisticCards]
  )

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over) return

    const cardId = active.id as string
    const card = cards.find((c) => c.id === cardId)
    if (!card) return

    let newStatus: CardStatus
    if (CARD_STATUS_ORDER.includes(over.id as CardStatus)) {
      newStatus = over.id as CardStatus
    } else {
      const overCard = cards.find((c) => c.id === over.id)
      if (!overCard) return
      newStatus = overCard.status
    }

    if (card.status === newStatus) return

    setOptimisticCards((prev) =>
      prev.map((c) =>
        c.id === cardId ? { ...c, status: newStatus, updatedAt: new Date().toISOString() } : c
      )
    )

    try {
      const res = await authFetch(`/api/cards/${cardId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
      const updated = await res.json()
      setCards((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
    } catch {
      toast.error(t.moveFailed)
      setOptimisticCards(cards)
    }
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4 h-full">
        {CARD_STATUS_ORDER.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            cards={getCardsByStatus(status)}
          />
        ))}
      </div>
    </DndContext>
  )
}
