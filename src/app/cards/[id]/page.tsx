"use client"

import { use, useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/types/card"
import { CARD_TYPE_LABELS, CARD_STATUS_LABELS } from "@/types/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ProtectedPage } from "@/components/layout/protected-page"
import { useI18n } from "@/i18n/context"
import type { Dictionary } from "@/i18n/dictionaries"
import { ArrowLeft, Pencil, Trash2, Calendar, Tag, Target } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { authFetch } from "@/lib/api-client"
import { cn } from "@/lib/utils"
import type { CardType, CardStatus } from "@/types/card"

const TYPE_COLORS: Record<string, string> = {
  learn: "bg-blue-100 text-blue-800 border-blue-200",
  todo: "bg-orange-100 text-orange-800 border-orange-200",
  reference: "bg-purple-100 text-purple-800 border-purple-200",
  idea: "bg-green-100 text-green-800 border-green-200",
}

function getTypeLabel(t: Dictionary, type: CardType) {
  return t.type[type] ?? CARD_TYPE_LABELS[type]
}

function getStatusLabel(t: Dictionary, status: CardStatus) {
  return t.status[status] ?? CARD_STATUS_LABELS[status]
}

export default function CardDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { t } = useI18n()
  const [card, setCard] = useState<Card | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchCard = useCallback(async () => {
    try {
      const res = await authFetch(`/api/cards/${id}`)
      if (!res.ok) throw new Error("Not found")
      setCard(await res.json())
    } catch {
      toast.error(t.card.notFound)
      router.push("/")
    } finally {
      setLoading(false)
    }
  }, [id, router, t])

  useEffect(() => { fetchCard() }, [fetchCard])

  const handleDelete = async () => {
    if (!confirm(t.card.confirmDelete)) return
    try {
      await authFetch(`/api/cards/${id}`, { method: "DELETE" })
      toast.success(t.card.deleted)
      router.push("/")
      router.refresh()
    } catch { toast.error(t.card.deleteFailed) }
  }

  const inner = loading ? (
    <div className="text-center py-12 text-muted-foreground">{t.card.loading}</div>
  ) : !card ? (
    <div className="text-center py-12 text-muted-foreground">
      {t.card.notFound}
      <Link href="/"><Button variant="link" size="sm">{t.nav.home}</Button></Link>
    </div>
  ) : (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/library">
          <Button variant="ghost" size="sm" className="gap-1"><ArrowLeft className="h-4 w-4" />{t.card.back}</Button>
        </Link>
        <div className="flex gap-2">
          <Link href={`/cards/${card.id}/edit`}>
            <Button variant="outline" size="sm" className="gap-1"><Pencil className="h-3 w-3" />{t.card.edit}</Button>
          </Link>
          <Button variant="outline" size="sm" className="gap-1 text-destructive hover:text-destructive" onClick={handleDelete}>
            <Trash2 className="h-3 w-3" />{t.card.delete}
          </Button>
        </div>
      </div>

      {card.imageUrl && (
        <div className="rounded-lg overflow-hidden border">
          <img src={card.imageUrl} alt={card.title} className="w-full max-h-96 object-contain bg-muted" />
        </div>
      )}

      <div className="space-y-3">
        <h1 className="text-xl font-bold">{card.title || t.card.unnamed}</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className={cn(TYPE_COLORS[card.type])}>{getTypeLabel(t, card.type)}</Badge>
          <Badge variant="secondary">{getStatusLabel(t, card.status)}</Badge>
        </div>
        {card.summary && <p className="text-muted-foreground">{card.summary}</p>}
      </div>

      <Separator />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {card.tags.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1"><Tag className="h-3 w-3" />{t.card.tags}</p>
            <div className="flex gap-1 flex-wrap">{card.tags.map((tag) => <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>)}</div>
          </div>
        )}
        {card.nextAction && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1"><Target className="h-3 w-3" />{t.card.action}</p>
            <p className="text-sm">{card.nextAction}</p>
          </div>
        )}
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" />{t.card.createdAt}</p>
          <p className="text-sm">{new Date(card.createdAt).toLocaleString("zh-CN")}</p>
        </div>
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" />{t.card.updatedAt}</p>
          <p className="text-sm">{new Date(card.updatedAt).toLocaleString("zh-CN")}</p>
        </div>
      </div>

      {card.ocrText && <><Separator /><div className="space-y-2"><h3 className="text-sm font-medium text-muted-foreground">{t.card.ocrText}</h3><p className="text-sm bg-muted p-3 rounded-md max-h-32 overflow-y-auto whitespace-pre-wrap">{card.ocrText}</p></div></>}
      {card.note && <><Separator /><div className="space-y-2"><h3 className="text-sm font-medium text-muted-foreground">{t.card.note}</h3><p className="text-sm bg-muted p-3 rounded-md whitespace-pre-wrap">{card.note}</p></div></>}
    </div>
  )

  return <ProtectedPage>{inner}</ProtectedPage>
}
