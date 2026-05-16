"use client"

import { use, useCallback, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card } from "@/types/card"
import { CARD_STATUS_LABELS } from "@/types/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card as UICard, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ProtectedPage } from "@/components/layout/protected-page"
import { useI18n } from "@/i18n/context"
import { ArrowLeft, Pencil, Trash2, Calendar, Tag, FileText, Image, Info } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { authFetch } from "@/lib/api-client"
import { CategorySelect } from "@/components/cards/category-select"
import { getCategoryColorClass } from "@/lib/category-colors"
import { cn } from "@/lib/utils"

const FROM_LABELS: Record<string, string> = {
  inbox: "返回收集箱",
  library: "返回资料库",
  board: "返回看板",
  home: "返回首页",
}

export default function CardDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const searchParams = useSearchParams()
  const from = searchParams.get("from")
  const { t } = useI18n()
  const [card, setCard] = useState<Card | null>(null)
  const [cardCategory, setCardCategory] = useState("")
  const [loading, setLoading] = useState(true)

  const fetchCard = useCallback(async () => {
    try {
      const res = await authFetch(`/api/cards/${id}`)
      if (!res.ok) throw new Error("Not found")
      const data = await res.json()
      setCard(data)
      setCardCategory(data.category || "")
    } catch {
      toast.error(t.card.notFound)
      router.back()
    } finally {
      setLoading(false)
    }
  }, [id, router, t])

  useEffect(() => { fetchCard() }, [fetchCard])

  const handleCategoryChange = async (v: string) => {
    if (!card) return
    try {
      await authFetch(`/api/cards/${card.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: v }),
      })
      setCardCategory(v)
      window.dispatchEvent(new Event("cards-updated"))
      toast.success(v ? `分类已设为「${v}」` : "已清除分类")
    } catch { toast.error("更新分类失败") }
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

  const goBack = () => {
    window.dispatchEvent(new Event("cards-updated"))
    if (from === "inbox") router.replace("/inbox")
    else if (from === "library") router.replace("/library")
    else if (from === "board") router.replace("/board")
    else if (from === "home") router.replace("/")
    else router.replace("/")
  }

  const backLabel = FROM_LABELS[from || ""] || t.card.back

  const hasImages = (card?.images?.length || 0) > 0 || !!card?.generatedImageUrl || !!card?.imageUrl
  const hasContent = !!card?.note || !!card?.summary

  if (loading) return <ProtectedPage><div className="text-center py-12 text-muted-foreground">{t.card.loading}</div></ProtectedPage>
  if (!card) return <ProtectedPage><div className="text-center py-12 text-muted-foreground">{t.card.notFound}<Link href="/"><Button variant="link" size="sm">{t.nav.home}</Button></Link></div></ProtectedPage>

  return (
    <ProtectedPage>
      <div className="max-w-[960px] mx-auto space-y-6">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" className="gap-1" onClick={goBack}>
            <ArrowLeft className="h-4 w-4" />{backLabel}
          </Button>
          <div className="flex gap-2">
            <Link href={`/cards/${card.id}/edit`}>
              <Button variant="outline" size="sm" className="gap-1"><Pencil className="h-3.5 w-3.5" />{t.card.edit}</Button>
            </Link>
            <Button variant="outline" size="sm" className="gap-1 text-destructive hover:bg-destructive/10" onClick={handleDelete}>
              <Trash2 className="h-3.5 w-3.5" />{t.card.delete}
            </Button>
          </div>
        </div>

        {/* Title card */}
        <UICard className="rounded-2xl">
          <CardContent className="pt-6">
            <h1 className="text-2xl font-bold tracking-tight">{card.title || t.card.unnamed}</h1>
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              {card.category ? (
                <Badge className={cn(getCategoryColorClass("gray"))}>{card.category}</Badge>
              ) : (
                <Badge variant="outline" className="text-muted-foreground">未分类</Badge>
              )}
              <Badge variant="secondary">{CARD_STATUS_LABELS[card.status]}</Badge>
            </div>
            {card.summary && (
              <p className="mt-3 text-muted-foreground leading-relaxed">{card.summary}</p>
            )}
            {!card.summary && (
              <p className="mt-3 text-sm text-muted-foreground/60">暂无简介，点击右上角「编辑」补充内容</p>
            )}
          </CardContent>
        </UICard>

        {/* Content: Images + Note */}
        {(hasImages || hasContent) && (
          <UICard className="rounded-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" />内容</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {hasImages && (
                <div className={cn("grid gap-3", (card.images?.length || 0) > 1 ? "grid-cols-2" : "grid-cols-1")}>
                  {card.images?.map((url, i) => (
                    <div key={i} className="rounded-xl overflow-hidden border bg-muted">
                      <img src={url} alt={`${card.title} ${i + 1}`} className="w-full max-h-[480px] object-contain" />
                    </div>
                  ))}
                  {(!card.images || card.images.length === 0) && (
                    <div className="rounded-xl overflow-hidden border bg-muted">
                      <img src={card.generatedImageUrl || card.imageUrl} alt={card.title} className="w-full max-h-[480px] object-contain" />
                    </div>
                  )}
                </div>
              )}
              {card.note && (
                <div className="p-4 rounded-xl bg-muted/50">
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{card.note}</p>
                </div>
              )}
            </CardContent>
          </UICard>
        )}

        {/* Empty content state */}
        {!hasImages && !hasContent && (
          <UICard className="rounded-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" />内容</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-10 text-muted-foreground">
                <Image className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">暂无正文内容</p>
                <p className="text-xs mt-1 text-muted-foreground/60">点击右上角「编辑」补充内容</p>
              </div>
            </CardContent>
          </UICard>
        )}

        {/* Properties */}
        <UICard className="rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Info className="h-4 w-4" />卡片属性</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground flex items-center gap-1"><Tag className="h-3 w-3" />分类</p>
                <CategorySelect value={cardCategory} onChange={handleCategoryChange} showAdd={false} />
              </div>
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground flex items-center gap-1"><Tag className="h-3 w-3" />状态</p>
                <p className="text-sm">{CARD_STATUS_LABELS[card.status]}</p>
              </div>
              {card.nextAction && (
                <div className="space-y-1.5 col-span-full">
                  <p className="text-xs text-muted-foreground">下一步行动</p>
                  <p className="text-sm">{card.nextAction}</p>
                </div>
              )}
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" />创建时间</p>
                <p className="text-sm font-mono">{new Date(card.createdAt).toLocaleString("zh-CN")}</p>
              </div>
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" />更新时间</p>
                <p className="text-sm font-mono">{new Date(card.updatedAt).toLocaleString("zh-CN")}</p>
              </div>
            </div>
          </CardContent>
        </UICard>

        {/* OCR text if exists */}
        {card.ocrText && (
          <UICard className="rounded-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t.card.ocrText}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm bg-muted p-4 rounded-xl max-h-32 overflow-y-auto whitespace-pre-wrap">{card.ocrText}</p>
            </CardContent>
          </UICard>
        )}
      </div>
    </ProtectedPage>
  )
}
