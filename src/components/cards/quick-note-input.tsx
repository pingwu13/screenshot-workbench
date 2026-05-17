"use client"

import { useState } from "react"
import { Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { authFetch } from "@/lib/api-client"
import { useI18n } from "@/i18n/context"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

const MAX_LENGTH = 80

export function QuickNoteInput() {
  const { t } = useI18n()
  const [text, setText] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const trimmed = text.trim()

  async function handleSubmit() {
    if (submitting || !trimmed) return
    if (trimmed.length > MAX_LENGTH) {
      toast.error(t.home.quickNoteMaxLength)
      return
    }

    setSubmitting(true)
    try {
      const res = await authFetch("/api/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: trimmed,
          summary: "",
          type: "idea",
          status: "inbox",
          tags: [],
          category: "",
          note: "",
          imageUrl: "",
          imagePath: "",
          images: [],
          generatedImageUrl: "",
          ocrText: "",
          nextAction: "",
          aiSummary: "",
          aiPlan: "",
        }),
      })
      if (!res.ok) throw new Error("Failed to create card")
      setText("")
      toast.success(t.home.quickNoteSuccess)
      window.dispatchEvent(new Event("cards-updated"))
    } catch {
      toast.error(t.home.quickNoteError)
    } finally {
      setSubmitting(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-full border bg-card px-4 py-1.5 transition-colors",
        "focus-within:ring-2 focus-within:ring-ring/50 focus-within:border-ring"
      )}
    >
      <input
        type="text"
        className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
        placeholder={t.home.quickNotePlaceholder}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        maxLength={MAX_LENGTH}
        disabled={submitting}
        autoComplete="off"
      />
      <span className="text-xs text-muted-foreground/60 shrink-0 tabular-nums select-none">
        {text.length}/{MAX_LENGTH}
      </span>
      <Button
        size="icon"
        variant="ghost"
        className="h-7 w-7 shrink-0"
        onClick={handleSubmit}
        disabled={submitting || !trimmed}
        aria-label="Submit quick note"
      >
        <Send className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}
