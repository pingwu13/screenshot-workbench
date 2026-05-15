"use client"

import { use, useCallback, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card } from "@/types/card"
import { CARD_STATUS_LABELS } from "@/types/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ProtectedPage } from "@/components/layout/protected-page"
import { useI18n } from "@/i18n/context"
import { ArrowLeft, Pencil, Trash2, Calendar, Tag, Target } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { authFetch } from "@/lib/api-client"
import { CategorySelect } from "@/components/cards/category-select"
import { getCategoryColorClass } from "@/lib/category-colors"
import { cn } from "@/lib/utils"

export default function CardDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const searchParams = useSearchParams()
  const from = searchParams.get("from")
  const { t } = useI18n()
  const [card, setCard] = useState<Card | null>(null)
  const [cardCategory, setCardCategory] = useState("")
  const [loading, setLoading] = useState(true)
  const [savingCategory, setSavingCategory] = useState(false)

  const fetchCard = useCallback(async () => {
    try {
      const res = await authFetch(`/api/cards/${id}`)
      if (!res.ok) throw new Error("Not found")
      const data = await res.json()
      setCard(data)
      setCardCategory(data.label || "")
    } catch {
      toast.error(t.card.notFound)
      router.back()
    } finally {
      setLoading(false)
    }
  }, [id, router, t])

  useEffect(() => { fetchCard() }, [fetchCard])

  const handleCategoryChange = async (newCategory: string) => {
    if (!card) return
    setSavingCategory(true)
    try {
      await authFetch(`/api/cards/${card.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: newCategory }),
      })
      setCardCategory(newCategory)
      window.dispatchEvent(new Event("cards-updated"))
      toast.success(newCategory ? `分类已设为「${newCategory}」` : "已清除分类")
    } catch { toast.error("更新分类失败") }
    finally { setSavingCategory(false) }
  }

  const handleDelete = async () => {
    if (!confirm(t.card.confirmDelete)) return
    try {
      await authFetch(`/api/cards/${id}`, { method: "DELETE" })
      toast.success(t.card.deleted)
      router.back()
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
        <Button variant="ghost" size="sm" className="gap-1" onClick={() => {
          window.dispatchEvent(new Event("cards-updated"))
          if (from === "inbox") router.replace("/inbox")
          else if (from === "library") router.replace("/library")
          else if (from === "board") router.replace("/board")
          else router.replace("/")
        }}><ArrowLeft className="h-4 w-4" />{t.card.back}</Button>
        <div className="flex gap-2">
          <Link href={`/cards/${card.id}/edit`}>
            <Button variant="outline" size="sm" className="gap-1"><Pencil className="h-3 w-3" />{t.card.edit}</Button>
          </Link>
          <Button variant="outline" size="sm" className="gap-1 text-destructive hover:text-destructive" onClick={handleDelete}>
            <Trash2 className="h-3 w-3" />{t.card.delete}
          </Button>
        </div>
      </div>

      {(card.images?.length > 0 || card.generatedImageUrl || card.imageUrl) && (
        <div className="grid grid-cols-2 gap-2">
          {card.images?.map((url, i) => (
            <div key={i} className="rounded-lg overflow-hidden border">
              <img src={url} alt={`${card.title} ${i + 1}`} className="w-full max-h-80 object-contain bg-muted" />
            </div>
          ))}
          {(!card.images || card.images.length === 0) && (
            <div className="rounded-lg overflow-hidden border">
              <img src={card.generatedImageUrl || card.imageUrl} alt={card.title} className="w-full max-h-80 object-contain bg-muted" />
            </div>
          )}
        </div>
      )}

      <div className="space-y-3">
        <h1 className="text-xl font-bold">{card.title || t.card.unnamed}</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary">{CARD_STATUS_LABELS[card.status]}</Badge>
          {card.category ? (
            <Badge className={cn(getCategoryColorClass("gray"))}>{card.category}</Badge>
          ) : null}
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
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground flex items-center gap-1"><Tag className="h-3 w-3" />分类</p>
          <CategorySelect value={cardCategory} onChange={(v) => handleCategoryChange(v)} showAdd={false} />
        </div>
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
