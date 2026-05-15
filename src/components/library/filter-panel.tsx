"use client"

import { CardType, CardStatus, CARD_TYPE_LABELS, CARD_STATUS_LABELS } from "@/types/card"
import { useI18n } from "@/i18n/context"
import type { Dictionary } from "@/i18n/dictionaries"
import { Badge } from "@/components/ui/badge"

interface FilterPanelProps {
  selectedTypes: CardType[]
  selectedStatuses: CardStatus[]
  onTypesChange: (types: CardType[]) => void
  onStatusesChange: (statuses: CardStatus[]) => void
}

const ALL_TYPES: CardType[] = ["learn", "todo", "reference", "idea"]
const ALL_STATUSES: CardStatus[] = ["inbox", "planned", "doing", "done", "archived"]

function getTypeLabel(t: Dictionary, type: CardType) {
  return t.type[type] ?? CARD_TYPE_LABELS[type]
}

function getStatusLabel(t: Dictionary, status: CardStatus) {
  return t.status[status] ?? CARD_STATUS_LABELS[status]
}

export function FilterPanel({
  selectedTypes,
  selectedStatuses,
  onTypesChange,
  onStatusesChange,
}: FilterPanelProps) {
  const { t } = useI18n()

  const toggleType = (type: CardType) => {
    if (selectedTypes.includes(type)) {
      onTypesChange(selectedTypes.filter((t) => t !== type))
    } else {
      onTypesChange([...selectedTypes, type])
    }
  }

  const toggleStatus = (status: CardStatus) => {
    if (selectedStatuses.includes(status)) {
      onStatusesChange(selectedStatuses.filter((s) => s !== status))
    } else {
      onStatusesChange([...selectedStatuses, status])
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-1.5">{t.library.filterByType}</p>
        <div className="flex gap-1.5 flex-wrap">
          {ALL_TYPES.map((type) => (
            <Badge
              key={type}
              variant={selectedTypes.includes(type) ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => toggleType(type)}
            >
              {getTypeLabel(t, type)}
            </Badge>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-medium text-muted-foreground mb-1.5">{t.library.filterByStatus}</p>
        <div className="flex gap-1.5 flex-wrap">
          {ALL_STATUSES.map((status) => (
            <Badge
              key={status}
              variant={selectedStatuses.includes(status) ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => toggleStatus(status)}
            >
              {getStatusLabel(t, status)}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  )
}
