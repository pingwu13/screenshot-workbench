"use client"

import { useCallback, useEffect, useState } from "react"
import { Card } from "@/types/card"
import { ProtectedPage } from "@/components/layout/protected-page"
import { authFetch } from "@/lib/api-client"
import { useI18n } from "@/i18n/context"
import { Inbox, CheckCircle, Circle, Sparkles, ChevronLeft, ChevronRight, Trash2, CheckSquare, Loader2 } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

const PAGE_SIZE = 12

type BatchMode = "classify" | "delete" | null

interface CatItem { id: string; name: string; color: string; sort_order: number }

function Pagination({
  page, totalPages, totalCards,
  onPrev, onNext,
}: {
  page: number; totalPages: number; totalCards: number
  onPrev: () => void; onNext: () => void
}) {
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-center gap-3 pt-4">
      <Button variant="outline" size="sm" onClick={onPrev} disabled={page <= 1} className="gap-1">
        <ChevronLeft className="h-4 w-4" />上一页
      </Button>
      <span className="text-sm text-muted-foreground">
        {page} / {totalPages} · 共 {totalCards} 张
      </span>
      <Button variant="outline" size="sm" onClick={onNext} disabled={page >= totalPages} className="gap-1">
        下一页<ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}

export default function InboxPage() {
  const { t } = useI18n()
  const [cards, setCards] = useState<Card[]>([])
  const [categories, setCategories] = useState<CatItem[]>([])
  const [batchMode, setBatchMode] = useState<BatchMode>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [typeDialog, setTypeDialog] = useState(false)
  const [pickedLabel, setPickedLabel] = useState("")
  const [saving, setSaving] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState(false)
  const [page, setPage] = useState(1)

  const selectable = batchMode !== null

  const loadCategories = useCallback(async () => {
    try { const res = await authFetch("/api/categories"); if (res.ok) setCategories(await res.json()) } catch {}
  }, [])

  const fetchCards = useCallback(async () => {
    const res = await authFetch("/api/cards")
    const all = await res.json()
    setCards((Array.isArray(all) ? all : []).filter((c: Card) => c.status === "inbox"))
  }, [])

  const totalPages = Math.max(1, Math.ceil(cards.length / PAGE_SIZE))
  const paginatedCards = cards.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const currentPageIds = paginatedCards.map((c) => c.id)

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  useEffect(() => { loadCategories() }, [loadCategories])
  useEffect(() => {
    fetchCards()
    const h = () => { fetchCards(); loadCategories() }
    window.addEventListener("cards-updated", h)
    window.addEventListener("categories-updated", h)
    return () => { window.removeEventListener("cards-updated", h); window.removeEventListener("categories-updated", h) }
  }, [fetchCards, loadCategories])

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const selectAllPage = () => {
    setSelected((prev) => {
      const next = new Set(prev)
      currentPageIds.forEach((id) => next.add(id))
      return next
    })
  }

  const deselectAllPage = () => {
    setSelected((prev) => {
      const next = new Set(prev)
      currentPageIds.forEach((id) => next.delete(id))
      return next
    })
  }

  const exitBatchMode = () => {
    setBatchMode(null)
    setSelected(new Set())
  }

  const enterClassifyMode = () => {
    setBatchMode("classify")
    setSelected(new Set())
    setPage(1)
  }

  const enterDeleteMode = () => {
    setBatchMode("delete")
    setSelected(new Set())
    setPage(1)
  }

  // ---- Batch classify ----
  const confirmClassify = async () => {
    if (!pickedLabel) return
    setSaving(true)
    try {
      const res = await authFetch("/api/cards/batch-classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardIds: Array.from(selected), category: pickedLabel }),
      })
      if (!res.ok) throw new Error("Failed")
      const data = await res.json()
      toast.success(`已将 ${data.updatedCount} 张卡片标记为「${pickedLabel}」分类`)
      setCards((prev) => prev.map((c) => selected.has(c.id) ? { ...c, category: pickedLabel } : c))
      setTypeDialog(false)
      exitBatchMode()
      window.dispatchEvent(new Event("cards-updated"))
    } catch {
      toast.error("分类失败")
    } finally {
      setSaving(false)
      setPickedLabel("")
    }
  }

  // ---- Batch delete ----
  const openDeleteDialog = () => {
    if (selected.size === 0) { toast.error("请先选择卡片"); return }
    setDeleteDialog(true)
  }

  const confirmBatchDelete = async () => {
    setDeleteDialog(false)
    setSaving(true)
    try {
      const res = await authFetch("/api/cards/bulk-delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardIds: Array.from(selected) }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `HTTP ${res.status}`)
      }
      const data = await res.json()
      toast.success(`已删除 ${data.deleted} 张卡片`)
      setCards((prev) => prev.filter((c) => !selected.has(c.id)))
      exitBatchMode()
      window.dispatchEvent(new Event("cards-updated"))
    } catch (err: any) {
      toast.error(err?.message || "批量删除失败")
    } finally {
      setSaving(false)
    }
  }

  const selectedOnPage = currentPageIds.filter((id) => selected.has(id)).length

  return (
    <ProtectedPage>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Inbox className="h-6 w-6" />{t.inbox.title}
            </h1>
            <p className="text-muted-foreground mt-1">{t.inbox.subtitle} ({cards.length})</p>
          </div>
          <div className="flex gap-2">
            <Link href="/cards/new"><Button size="sm">{t.nav.newCard}</Button></Link>
            {!selectable ? (
              <>
                <Button variant="outline" size="sm" onClick={enterClassifyMode}>分类</Button>
                <Button variant="outline" size="sm" className="gap-1 text-destructive hover:bg-destructive/10" onClick={enterDeleteMode}>
                  <Trash2 className="h-3.5 w-3.5" />批量删除
                </Button>
              </>
            ) : (
              <Button variant="outline" size="sm" onClick={exitBatchMode}>取消</Button>
            )}
          </div>
        </div>

        {/* Batch action bar */}
        {selectable && (
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg border bg-muted/30 text-sm">
            <span className="font-medium">
              已选择 <span className="text-primary">{selected.size}</span> 张卡片
              {selectedOnPage > 0 && totalPages > 1 && (
                <span className="text-muted-foreground font-normal">（当前页 {selectedOnPage} 张）</span>
              )}
            </span>
            <div className="flex-1" />
            <Button variant="ghost" size="sm" className="gap-1" onClick={selectAllPage}>
              <CheckSquare className="h-3.5 w-3.5" />全选当前页
            </Button>
            <Button variant="ghost" size="sm" onClick={deselectAllPage}>取消全选</Button>
            {batchMode === "classify" && (
              <Button size="sm" disabled={selected.size === 0}
                onClick={() => {
                  if (selected.size === 0) { toast.error("请先选择卡片"); return }
                  setPickedLabel("")
                  setTypeDialog(true)
                }}>
                分类...
              </Button>
            )}
            {batchMode === "delete" && (
              <Button size="sm" disabled={selected.size === 0} variant="destructive"
                onClick={openDeleteDialog}>
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                确认删除
              </Button>
            )}
          </div>
        )}

        {/* Card grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {paginatedCards.length === 0 ? (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              <p className="text-lg">{t.noCards}</p>
              <p className="text-sm mt-1">{t.noCardsHint}</p>
            </div>
          ) : (
            paginatedCards.map((card) => (
              <SelectableCardItem
                key={card.id} card={card}
                selectable={selectable} selected={selected.has(card.id)}
                onToggle={() => toggleSelect(card.id)}
              />
            ))
          )}
        </div>

        <Pagination
          page={page} totalPages={totalPages} totalCards={cards.length}
          onPrev={() => setPage((p) => Math.max(1, p - 1))}
          onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
        />

        {/* Classify dialog */}
        <Dialog open={typeDialog} onOpenChange={setTypeDialog}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>选择分类标签</DialogTitle></DialogHeader>
            <p className="text-sm text-muted-foreground">将 {selected.size} 张卡片分类到：</p>
            <div className="grid grid-cols-2 gap-2">
              {categories.map((c) => (
                <Button key={c.id} variant={pickedLabel === c.name ? "default" : "outline"} onClick={() => setPickedLabel(c.name)}>{c.name}</Button>
              ))}
            </div>
            <div className="flex gap-2 justify-end mt-2">
              <Button variant="ghost" onClick={() => setTypeDialog(false)}>取消</Button>
              <Button disabled={!pickedLabel || saving} onClick={confirmClassify}>
                {saving ? "处理中..." : "确认分类"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete confirmation dialog */}
        <Dialog open={deleteDialog} onOpenChange={setDeleteDialog}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>确认删除选中的卡片？</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              将删除已选中的 {selected.size} 张卡片。此操作不可恢复。
            </p>
            <div className="flex gap-2 justify-end mt-2">
              <Button variant="ghost" onClick={() => setDeleteDialog(false)}>取消</Button>
              <Button variant="destructive" onClick={confirmBatchDelete} disabled={saving}>
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                确认删除
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedPage>
  )
}

function SelectableCardItem({ card, selectable, selected, onToggle }: {
  card: Card; selectable: boolean; selected: boolean; onToggle: () => void
}) {
  const handleClick = () => {
    if (selectable) { onToggle(); return }
    window.location.href = `/cards/${card.id}?from=inbox`
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      handleClick()
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={cn(
        "block w-full text-left p-4 rounded-lg border bg-card hover:shadow-md transition-all cursor-pointer relative",
        selected && "ring-2 ring-primary bg-primary/5 border-primary/50"
      )}>
      {/* Batch checkbox — top-left */}
      {selectable && (
        <span className="absolute top-3 left-3 z-10">
          {selected
            ? <CheckCircle className="h-5 w-5 text-primary" />
            : <Circle className="h-5 w-5 text-muted-foreground/40" />
          }
        </span>
      )}

      <div className={cn("flex items-start justify-between gap-2", selectable && "pl-7")}>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm leading-tight line-clamp-2">{card.title || "未命名卡片"}</h3>
          {card.summary && <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{card.summary}</p>}
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
            <span>创建 {new Date(card.createdAt).toLocaleDateString("zh-CN")}</span>
            <span className="mx-1 text-muted-foreground/40">·</span>
            <span>更新 {new Date(card.updatedAt).toLocaleString("zh-CN")}</span>
          </div>
        </div>
        {!selectable && (
          <Link href={`/workbench?cardId=${card.id}&from=inbox`}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            className="shrink-0 self-start">
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" tabIndex={0}><Sparkles className="h-3 w-3" />处理</Button>
          </Link>
        )}
      </div>
    </div>
  )
}
