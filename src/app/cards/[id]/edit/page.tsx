"use client"

import { use, useCallback, useEffect, useState } from "react"
import { Card } from "@/types/card"
import { CardForm } from "@/components/cards/card-form"
import { ProtectedPage } from "@/components/layout/protected-page"
import { authFetch } from "@/lib/api-client"
import { useI18n } from "@/i18n/context"

export default function EditCardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { t } = useI18n()
  const [card, setCard] = useState<Card | null>(null)

  const fetchCard = useCallback(async () => {
    const res = await authFetch(`/api/cards/${id}`)
    if (res.ok) setCard(await res.json())
  }, [id])

  useEffect(() => { fetchCard() }, [fetchCard])

  return (
    <ProtectedPage>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t.card.editTitle}</h1>
          <p className="text-muted-foreground mt-1">{t.card.editSubtitle}</p>
        </div>
        {card ? <CardForm initialData={card} /> : <div className="text-center py-12 text-muted-foreground">{t.card.loading}</div>}
      </div>
    </ProtectedPage>
  )
}
