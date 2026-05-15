"use client"

import { useCallback, useEffect, useState } from "react"
import { Card } from "@/types/card"
import { ProtectedPage } from "@/components/layout/protected-page"
import { authFetch } from "@/lib/api-client"
import { getCategoryColorClass } from "@/lib/category-colors"
import { useI18n } from "@/i18n/context"
import { Inbox, CheckCircle, Circle } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface CatItem { id: string; name: string; color: string; sort_order: number }

export default function InboxPage() {
  const { t } = useI18n()
  const [cards, setCards] = useState<Card[]>([])
  const [categories, setCategories] = useState<CatItem[]>([])
  const [classifyMode, setClassifyMode] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [typeDialog, setTypeDialog] = useState(false)
  const [pickedLabel, setPickedLabel] = useState("")
  const [saving, setSaving] = useState(false)

  const loadCategories = useCallback(async () => {
    try { const res = await authFetch("/api/categories"); if (res.ok) setCategories(await res.json()) } catch {}
  }, [])

  const fetchCards = useCallback(async () => {
    const res = await authFetch("/api/cards")
    const all = await res.json()
    // Inbox = cards without a label
    setCards((Array.isArray(all) ? all : []).filter((c: Card) => !c.category || !c.category.trim()))
  }, [])

  useEffect(() => { loadCategories() }, [loadCategories])
  useEffect(() => {
    fetchCards()
    const h = () => { fetchCards(); loadCategories() }
    window.addEventListener("cards-updated", h)
    window.addEventListener("categories-updated", h)
    return () => { window.removeEventListener("cards-updated", h); window.removeEventListener("categories-updated", h) }
  }, [fetchCards, loadCategories])

  const toggleSelect = (id: string) => {
    const next = new Set(selected)
    next.has(id) ? next.delete(id) : next.add(id)
    setSelected(next)
  }

  const exitClassify = () => { setClassifyMode(false); setSelected(new Set()) }

  const confirmClassify = async () => {
    if (!pickedLabel) return
    setSaving(true)
    try {
      const res = await authFetch("/api/cards/batch-classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardIds: Array.from(selected), label: pickedLabel }),
      })
      if (!res.ok) throw new Error("Failed")
      const data = await res.json()
      toast.success(`已将 ${data.updatedCount} 张卡片分类到「${pickedLabel}」`)
      // Remove classified cards from local state immediately
      setCards((prev) => prev.filter((c) => !selected.has(c.id)))
      setTypeDialog(false)
      exitClassify()
      window.dispatchEvent(new Event("cards-updated"))
    } catch {
      toast.error("分类失败")
    } finally {
      setSaving(false)
      setPickedLabel("")
    }
  }

  return (
    <ProtectedPage>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Inbox className="h-6 w-6" />{t.inbox.title}
            </h1>
            <p className="text-muted-foreground mt-1">{t.inbox.subtitle} ({cards.length})</p>
          </div>
          <div className="flex gap-2">
            <Link href="/cards/new"><Button>{t.nav.newCard}</Button></Link>
            <Button variant={classifyMode ? "default" : "outline"} onClick={classifyMode ? exitClassify : () => setClassifyMode(true)}>
              {classifyMode ? "取消分类" : "分类"}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {cards.length === 0 ? (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              <p className="text-lg">{t.noCards}</p>
              <p className="text-sm mt-1">{t.noCardsHint}</p>
            </div>
          ) : (
            cards.map((card) => (
              <SelectableCardItem
                key={card.id} card={card}
                selectable={classifyMode} selected={selected.has(card.id)}
                onToggle={() => toggleSelect(card.id)}
              />
            ))
          )}
        </div>

        {classifyMode && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-card border rounded-2xl shadow-lg px-6 py-3 flex items-center gap-6">
            <span className="text-sm font-medium">已选择 {selected.size} 张卡片</span>
            <Button variant="ghost" size="sm" onClick={exitClassify}>取消</Button>
            <Button size="sm" disabled={selected.size === 0}
              onClick={() => { setPickedLabel(""); setTypeDialog(true) }}>
              确定选中
            </Button>
          </div>
        )}

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

  return (
    <button onClick={handleClick}
      className={cn(
        "block w-full text-left p-4 rounded-lg border bg-card hover:shadow-md transition-all",
        selected && "ring-2 ring-black bg-primary/5"
      )}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm leading-tight line-clamp-2">{card.title || "未命名卡片"}</h3>
          {card.summary && <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{card.summary}</p>}
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
            <span>创建 {new Date(card.createdAt).toLocaleDateString("zh-CN")}</span>
            <span className="mx-1 text-muted-foreground/40">·</span>
            <span>更新 {new Date(card.updatedAt).toLocaleString("zh-CN")}</span>
          </div>
        </div>
        {selectable && (
          selected ? <CheckCircle className="h-5 w-5 text-black shrink-0" /> : <Circle className="h-5 w-5 text-muted-foreground/40 shrink-0" />
        )}
      </div>
    </button>
  )
}
