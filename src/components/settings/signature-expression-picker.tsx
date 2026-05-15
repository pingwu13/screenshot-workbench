"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { signatureExpressionGroups } from "@/data/signature-expressions"
import { Smile } from "lucide-react"
import { cn } from "@/lib/utils"

interface ExpressionPickerProps {
  onSelect: (value: string) => void
}

export function ExpressionPicker({ onSelect }: ExpressionPickerProps) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState("emoji")

  const activeGroup = signatureExpressionGroups.find((g) => g.id === tab)

  const handleSelect = (value: string) => {
    onSelect(value)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="inline-flex items-center gap-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground">
        <Smile className="h-3.5 w-3.5" />
        表情
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="start">
        <div className="flex gap-1 mb-3">
          {signatureExpressionGroups.map((g) => (
            <Button
              key={g.id}
              variant={tab === g.id ? "default" : "ghost"}
              size="sm"
              className="text-xs h-7"
              onClick={() => setTab(g.id)}
            >
              {g.label}
            </Button>
          ))}
        </div>

        {activeGroup && (
          <div
            className={cn(
              "max-h-48 overflow-y-auto",
              tab === "emoji"
                ? "grid grid-cols-8 gap-1"
                : "flex flex-col gap-0.5"
            )}
          >
            {activeGroup.items.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => handleSelect(item)}
                className={cn(
                  "hover:bg-accent rounded transition-colors",
                  tab === "emoji"
                    ? "h-8 w-8 flex items-center justify-center text-lg"
                    : "px-2 py-1 text-sm text-left"
                )}
              >
                {item}
              </button>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
