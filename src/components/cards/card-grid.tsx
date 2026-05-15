"use client"

import { Card } from "@/types/card"
import { CardItem } from "@/components/cards/card-item"
import { useI18n } from "@/i18n/context"

interface CardGridProps {
  cards: Card[]
}

export function CardGrid({ cards }: CardGridProps) {
  const { t } = useI18n()

  if (cards.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-lg">{t.noCards}</p>
        <p className="text-sm mt-1">{t.noCardsHint}</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {cards.map((card) => (
        <CardItem key={card.id} card={card} />
      ))}
    </div>
  )
}
