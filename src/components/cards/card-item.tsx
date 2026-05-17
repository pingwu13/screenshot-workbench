"use client"

import Link from "next/link"
import { Card, CARD_STATUS_LABELS } from "@/types/card"
import { Badge } from "@/components/ui/badge"
import { useI18n } from "@/i18n/context"
import { getCategoryColorClass } from "@/lib/category-colors"
import { cn, CLICKABLE_CARD } from "@/lib/utils"
import { Calendar } from "lucide-react"

interface CardItemProps {
  card: Card
  from?: string
  className?: string
}

export function CardItem({ card, from, className }: CardItemProps) {
  const { t } = useI18n()

  const href = from ? `/cards/${card.id}?from=${from}` : `/cards/${card.id}`

  return (
    <Link
      href={href}
      className={cn(
        "block p-4 rounded-lg border bg-card", CLICKABLE_CARD,
        className
      )}
    >
      {(card.images?.[0] || card.generatedImageUrl || card.imageUrl) && (
        <div className="mb-3 -mx-4 -mt-4 overflow-hidden rounded-t-lg">
          <img
            src={card.images?.[0] || card.generatedImageUrl || card.imageUrl}
            alt={card.title}
            className="w-full h-32 object-cover"
          />
          {card.images && card.images.length > 1 && (
            <span className="absolute top-2 right-2 bg-black/50 text-white text-xs px-1.5 py-0.5 rounded">{card.images.length}图</span>
          )}
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className={cn(
            "font-medium text-sm leading-tight line-clamp-2",
            !(card.images?.[0] || card.generatedImageUrl || card.imageUrl) && "text-lg font-bold"
          )}>
            {card.title || t.card.unnamed}
          </h3>
          {card.category ? (
            <Badge variant="outline" className={cn("shrink-0 text-xs", getCategoryColorClass("gray"))}>{card.category}</Badge>
          ) : null}
        </div>

        {card.summary && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {card.summary}
          </p>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">
            {CARD_STATUS_LABELS[card.status]}
          </span>

          {card.tags.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap">
              {card.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded"
                >
                  {tag}
                </span>
              ))}
              {card.tags.length > 3 && (
                <span className="text-xs text-muted-foreground">
                  +{card.tags.length - 3}
                </span>
              )}
            </div>
          )}
        </div>

        {card.nextAction && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span className="font-medium">{t.card.nextStep}:</span>
            <span className="truncate">{card.nextAction}</span>
          </div>
        )}

        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3" />
          <span>创建 {new Date(card.createdAt).toLocaleDateString("zh-CN")}</span>
          <span className="mx-1 text-muted-foreground/40">·</span>
          <span>更新 {new Date(card.updatedAt).toLocaleString("zh-CN")}</span>
        </div>
      </div>
    </Link>
  )
}
