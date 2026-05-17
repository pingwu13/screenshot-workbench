"use client"

import { useI18n } from "@/i18n/context"
import { locales, type Locale } from "@/i18n/dictionaries"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { Globe } from "lucide-react"

const LOCALE_FLAGS: Record<Locale, string> = {
  "zh-CN": "中",
  en: "EN",
  ja: "日",
}

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n()

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-accent hover:text-accent-foreground">
            <Globe className="h-4 w-4" />
            <span className="sr-only">Switch language</span>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom">{t.tooltips.switchLanguage}</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end">
        {locales.map((l) => (
          <DropdownMenuItem
            key={l.value}
            onClick={() => setLocale(l.value)}
            className="gap-2"
          >
            <span className="inline-flex items-center justify-center h-5 w-5 rounded bg-muted text-xs font-medium">
              {LOCALE_FLAGS[l.value]}
            </span>
            <span>{l.label}</span>
            {locale === l.value && (
              <span className="ml-auto text-xs text-muted-foreground">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
