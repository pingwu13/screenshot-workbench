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
import { ArrowLeft, ArrowRight, Pencil, Trash2, Calendar, Tag, FileText, Image, Info, Sparkles, Workflow, Play, ChevronRight } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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
  workbench: "返回工作台",
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
  const [plans, setPlans] = useState<any[]>([])
  const [selectedPlan, setSelectedPlan] = useState<any | null>(null)

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

  const fetchPlans = useCallback(async () => {
    try {
      const res = await authFetch(`/api/cards/${id}/ai-plans`)
      if (res.ok) {
        const newPlans = await res.json()
        setPlans((prev) => (JSON.stringify(prev) !== JSON.stringify(newPlans) ? newPlans : prev))
      }
    } catch {}
  }, [id])

  useEffect(() => {
    fetchPlans()
    window.addEventListener("ai-plans-updated", fetchPlans)
    return () => window.removeEventListener("ai-plans-updated", fetchPlans)
  }, [fetchPlans])

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

  const handleStatusChange = async (v: string) => {
    if (!card) return
    try {
      await authFetch(`/api/cards/${card.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: v }),
      })
      setCard({ ...card, status: v as Card["status"] })
      window.dispatchEvent(new Event("cards-updated"))
      toast.success(`状态已更新`)
    } catch { toast.error("更新状态失败") }
  }

  const handleDelete = async () => {
    if (!confirm(t.card.confirmDelete)) return
    try {
      await authFetch(`/api/cards/${id}`, { method: "DELETE" })
      toast.success(t.card.deleted)
      if (from === "inbox") router.replace("/inbox")
      else if (from === "library") router.replace("/library")
      else if (from === "board") router.replace("/board")
      else if (from === "workbench") router.replace("/workbench")
      else if (from === "home") router.replace("/")
      else router.replace("/library")
      router.refresh()
    } catch { toast.error(t.card.deleteFailed) }
  }

  const goBack = () => {
    window.dispatchEvent(new Event("cards-updated"))
    if (from === "inbox") router.replace("/inbox")
    else if (from === "library") router.replace("/library")
    else if (from === "board") router.replace("/board")
    else if (from === "workbench") router.replace(`/workbench?cardId=${card?.id}&from=workbench`)
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
            <Link href={`/workbench?cardId=${card.id}&from=${from || "detail"}`}>
              <Button variant="outline" size="sm" className="gap-1"><Workflow className="h-3.5 w-3.5" />工作台</Button>
            </Link>
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
              <CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" />原始内容</CardTitle>
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

        {/* AI Plans */}
        <UICard className="rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Sparkles className="h-4 w-4" />AI 处理方案</CardTitle>
          </CardHeader>
          <CardContent>
            {plans.length > 0 ? (
              <div className="space-y-2">
                {plans.map((p) => (
                  <button key={p.id} onClick={() => setSelectedPlan(p)}
                    className="w-full text-left p-3 rounded-xl border hover:bg-accent transition-colors flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.title || "未命名方案"}</p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{p.summary}</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-1">{new Date(p.created_at).toLocaleString("zh-CN")}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </button>
                ))}
              </div>
            ) : card.aiPlan ? (
              // Legacy: show old aiPlan if exists
              <div className="p-4 rounded-xl bg-muted/50">
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{card.aiPlan}</p>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">还没有 AI 处理方案</p>
                <Link href={`/workbench?cardId=${card.id}&from=${from || "detail"}`}>
                  <Button variant="outline" size="sm" className="gap-1 mt-2"><Workflow className="h-3.5 w-3.5" />进入工作台</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </UICard>

        {/* Plan Detail Dialog */}
        <Dialog open={!!selectedPlan} onOpenChange={() => setSelectedPlan(null)}>
          <DialogContent className="max-w-xl max-h-[70vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>{selectedPlan?.title || "方案详情"}</DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto space-y-3">
              <p className="text-[10px] text-muted-foreground">{selectedPlan?.created_at ? new Date(selectedPlan.created_at).toLocaleString("zh-CN") : ""}</p>
              <div className="p-4 rounded-xl bg-muted/50">
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{selectedPlan?.content}</p>
              </div>
            </div>
            <div className="flex justify-between gap-2 pt-2 border-t">
              <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10"
                onClick={async () => {
                  if (!selectedPlan || !confirm("确定删除这个 AI 方案吗？删除后不可恢复。")) return
                  try {
                    await authFetch(`/api/cards/${card.id}/ai-plans/${selectedPlan.id}`, { method: "DELETE" })
                    setSelectedPlan(null)
                    setPlans((prev) => prev.filter((p) => p.id !== selectedPlan.id))
                    window.dispatchEvent(new Event("ai-plans-updated"))
                    toast.success("方案已删除")
                  } catch { toast.error("删除失败") }
                }}>
                <Trash2 className="h-3.5 w-3.5 mr-1" />删除方案
              </Button>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setSelectedPlan(null)}>关闭</Button>
                <Button variant="outline" size="sm" className="gap-1"
                  onClick={async () => {
                    if (!selectedPlan) return
                    const action = (selectedPlan.summary || selectedPlan.content || "").slice(0, 50)
                    try {
                      await authFetch(`/api/cards/${card.id}`, {
                        method: "PATCH", headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ nextAction: action }),
                      })
                      window.dispatchEvent(new Event("cards-updated"))
                      toast.success("已设为下一步行动")
                      setSelectedPlan(null)
                    } catch { toast.error("操作失败") }
                  }}>
                  <ArrowRight className="h-3.5 w-3.5" />设为下一步行动
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

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
                <Select value={card.status} onValueChange={(v) => v && handleStatusChange(v)}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue>{CARD_STATUS_LABELS[card.status]}</SelectValue></SelectTrigger>
                  <SelectContent>
                    {(Object.entries(CARD_STATUS_LABELS) as [string, string][]).map(([v, label]) => (
                      <SelectItem key={v} value={v}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {card.nextAction && (
                <div className="space-y-1.5 col-span-full">
                  <p className="text-xs text-muted-foreground">下一步行动</p>
                  <Button
                    className="w-full justify-start gap-2"
                    onClick={async () => {
                      try {
                        await authFetch(`/api/cards/${card.id}`, {
                          method: "PATCH", headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ status: "doing" }),
                        })
                        setCard({ ...card, status: "doing" })
                        window.dispatchEvent(new Event("cards-updated"))
                        toast.success("已开始处理，进入进行中状态")
                      } catch { toast.error("操作失败") }
                    }}
                  >
                    <Play className="h-4 w-4" />
                    <span className="text-sm">开始：{card.nextAction}</span>
                  </Button>
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
