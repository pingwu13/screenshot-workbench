"use client"

import { useCallback, useEffect, useState } from "react"
import { Card, CardStatus, CARD_STATUS_LABELS } from "@/types/card"
import { CardGrid } from "@/components/cards/card-grid"
import { SearchBar } from "@/components/library/search-bar"
import { ProtectedPage } from "@/components/layout/protected-page"
import { authFetch } from "@/lib/api-client"
import { CARD_LABELS } from "@/data/card-labels"
import { useI18n } from "@/i18n/context"
import { Badge } from "@/components/ui/badge"
import { Library } from "lucide-react"

const ALL_STATUSES: CardStatus[] = ["inbox", "planned", "doing", "done", "archived"]

export default function LibraryPage() {
  const { t } = useI18n()
  const [cards, setCards] = useState<Card[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")
  const [selectedLabel, setSelectedLabel] = useState("")
  const [selectedStatuses, setSelectedStatuses] = useState<CardStatus[]>([])

  const fetchCards = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (query) params.set("q", query)
      const res = await authFetch(`/api/cards?${params}`)
      setCards(await res.json())
    } catch (err) { console.error(err) } finally { setLoading(false) }
  }, [query])

  useEffect(() => {
    fetchCards()
    window.addEventListener("cards-updated", fetchCards)
    return () => window.removeEventListener("cards-updated", fetchCards)
  }, [fetchCards])

  const filtered = cards.filter((c) => {
    if (selectedLabel === "__unlabeled__" && c.label?.trim()) return false
    if (selectedLabel && selectedLabel !== "__unlabeled__" && c.label?.trim() !== selectedLabel) return false
    if (selectedStatuses.length > 0 && !selectedStatuses.includes(c.status)) return false
    return true
  })

  return (
    <ProtectedPage>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Library className="h-6 w-6" />{t.library.title}
          </h1>
          <p className="text-muted-foreground mt-1">{t.library.subtitle} ({filtered.length})</p>
        </div>
        <SearchBar value={query} onChange={setQuery} />

        <div className="space-y-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">标签</p>
            <div className="flex gap-1.5 flex-wrap">
              <Badge variant={selectedLabel === "" ? "default" : "outline"} className="cursor-pointer" onClick={() => setSelectedLabel("")}>全部</Badge>
              <Badge variant={selectedLabel === "__unlabeled__" ? "default" : "outline"} className="cursor-pointer" onClick={() => setSelectedLabel("__unlabeled__")}>未分类</Badge>
              {CARD_LABELS.map((l) => (
                <Badge key={l} variant={selectedLabel === l ? "default" : "outline"} className="cursor-pointer" onClick={() => setSelectedLabel(l)}>{l}</Badge>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">状态</p>
            <div className="flex gap-1.5 flex-wrap">
              {ALL_STATUSES.map((s) => (
                <Badge key={s} variant={selectedStatuses.includes(s) ? "default" : "outline"} className="cursor-pointer"
                  onClick={() => setSelectedStatuses((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s])}>
                  {CARD_STATUS_LABELS[s]}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">{t.library.loading}</div>
        ) : (
          <CardGrid cards={filtered} from="library" />
        )}
      </div>
    </ProtectedPage>
  )
}
