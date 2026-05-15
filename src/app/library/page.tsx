"use client"

import { useCallback, useEffect, useState } from "react"
import { Card, CardType, CardStatus } from "@/types/card"
import { CardGrid } from "@/components/cards/card-grid"
import { SearchBar } from "@/components/library/search-bar"
import { FilterPanel } from "@/components/library/filter-panel"
import { ProtectedPage } from "@/components/layout/protected-page"
import { authFetch } from "@/lib/api-client"
import { useI18n } from "@/i18n/context"
import { Library } from "lucide-react"

export default function LibraryPage() {
  const { t } = useI18n()
  const [cards, setCards] = useState<Card[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")
  const [selectedTypes, setSelectedTypes] = useState<CardType[]>([])
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

  useEffect(() => { fetchCards() }, [fetchCards])

  const filtered = cards.filter((c) => {
    if (selectedTypes.length > 0 && !selectedTypes.includes(c.type)) return false
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
        <FilterPanel selectedTypes={selectedTypes} selectedStatuses={selectedStatuses} onTypesChange={setSelectedTypes} onStatusesChange={setSelectedStatuses} />
        {loading ? <div className="text-center py-12 text-muted-foreground">{t.library.loading}</div> : <CardGrid cards={filtered} />}
      </div>
    </ProtectedPage>
  )
}
