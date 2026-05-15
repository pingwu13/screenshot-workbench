"use client"

import { Card } from "@/types/card"
import { CARD_TYPE_LABELS } from "@/types/card"
import { Badge } from "@/components/ui/badge"
import { useI18n } from "@/i18n/context"
import type { Dictionary } from "@/i18n/dictionaries"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import type { CardType } from "@/types/card"

interface KanbanCardProps {
  card: Card
}

const TYPE_COLORS: Record<string, string> = {
  learn: "bg-blue-100 text-blue-800 border-blue-200",
  todo: "bg-orange-100 text-orange-800 border-orange-200",
  reference: "bg-purple-100 text-purple-800 border-purple-200",
  idea: "bg-green-100 text-green-800 border-green-200",
}

function getTypeLabel(t: Dictionary, type: CardType) {
  return t.type[type] ?? CARD_TYPE_LABELS[type]
}

export function KanbanCard({ card }: KanbanCardProps) {
  const { t } = useI18n()
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id, data: { card } })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <Link
      ref={setNodeRef}
      style={style}
      href={`/cards/${card.id}?from=board`}
      className={cn(
        "block p-3 rounded-md border bg-card hover:shadow-sm transition-shadow",
        isDragging && "opacity-50 shadow-lg"
      )}
    >
      <div className="flex items-start gap-2">
        <div
          {...attributes}
          {...listeners}
          className="shrink-0 mt-0.5 cursor-grab text-muted-foreground hover:text-foreground touch-none"
        >
          <GripVertical className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0 space-y-1.5">
          {card.imageUrl && (
            <img
              src={card.imageUrl}
              alt=""
              className="w-full h-20 object-cover rounded"
            />
          )}
          <p className="text-sm font-medium leading-tight line-clamp-2">
            {card.title || t.card.unnamed}
          </p>
          {card.summary && (
            <p className="text-xs text-muted-foreground line-clamp-2">
              {card.summary}
            </p>
          )}
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge
              variant="outline"
              className={cn("text-xs px-1 py-0", TYPE_COLORS[card.type])}
            >
              {getTypeLabel(t, card.type)}
            </Badge>
            {card.tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="text-xs text-muted-foreground bg-muted px-1 py-0 rounded"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </Link>
  )
}
