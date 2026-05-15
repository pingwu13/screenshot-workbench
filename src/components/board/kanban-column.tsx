"use client"

import { Card, CardStatus, CARD_STATUS_LABELS } from "@/types/card"
import { KanbanCard } from "@/components/board/kanban-card"
import { useI18n } from "@/i18n/context"
import { useDroppable } from "@dnd-kit/core"
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { cn } from "@/lib/utils"

interface KanbanColumnProps {
  status: CardStatus
  cards: Card[]
}

const STATUS_COLORS: Record<CardStatus, string> = {
  inbox: "border-t-gray-400",
  planned: "border-t-blue-400",
  doing: "border-t-orange-400",
  done: "border-t-green-400",
  archived: "border-t-slate-300",
}

export function KanbanColumn({ status, cards }: KanbanColumnProps) {
  const { t } = useI18n()
  const { setNodeRef, isOver } = useDroppable({ id: status })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col w-72 shrink-0 rounded-lg border bg-muted/40 min-h-[200px] transition-colors",
        STATUS_COLORS[status],
        "border-t-2",
        isOver && "bg-muted/80 ring-2 ring-primary/20"
      )}
    >
      <div className="flex items-center justify-between px-3 py-2.5 border-b bg-card/50 rounded-t-lg">
        <h3 className="text-sm font-medium">
          {t.status[status] ?? CARD_STATUS_LABELS[status]}
        </h3>
        <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
          {cards.length}
        </span>
      </div>

      <div className="flex-1 p-2 space-y-2 overflow-y-auto">
        <SortableContext
          items={cards.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          {cards.map((card) => (
            <KanbanCard key={card.id} card={card} />
          ))}
        </SortableContext>

        {cards.length === 0 && (
          <div className="text-center py-8 text-xs text-muted-foreground">
            {t.boardColumn.dragHere}
          </div>
        )}
      </div>
    </div>
  )
}
