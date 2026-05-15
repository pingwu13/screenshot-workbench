"use client"

import { useEffect } from "react"
import { DailyQuote } from "@/data/daily-quotes"
import { X } from "lucide-react"

const CATEGORY_LABELS: Record<string, string> = {
  classic: "古诗文",
  programming: "编程",
  proverb: "英语谚语",
}

interface CheckInToastProps {
  quote: DailyQuote
  onClose: () => void
}

export function CheckInToast({ quote, onClose }: CheckInToastProps) {
  // Auto-dismiss after 6 seconds
  useEffect(() => {
    const timer = setTimeout(onClose, 6000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div className="fixed bottom-6 left-6 z-50 animate-in slide-in-from-left">
      <div className="bg-card border rounded-xl shadow-lg p-4 max-w-sm">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <span className="inline-block text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded mb-1.5">
              {CATEGORY_LABELS[quote.category] || quote.category}
            </span>
            <p className="text-sm leading-relaxed line-clamp-2">{quote.text}</p>
            {quote.source && (
              <p className="text-xs text-muted-foreground mt-1">{quote.source}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="shrink-0 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
