"use client"

import { CardForm } from "@/components/cards/card-form"
import { useI18n } from "@/i18n/context"

export default function NewCardPage() {
  const { t } = useI18n()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t.card.newTitle}</h1>
        <p className="text-muted-foreground mt-1">{t.card.newSubtitle}</p>
      </div>
      <CardForm />
    </div>
  )
}
