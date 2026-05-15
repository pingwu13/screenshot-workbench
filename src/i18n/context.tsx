"use client"

import { createContext, useCallback, useContext, useEffect, useState } from "react"
import { type Locale, type Dictionary, getDictionary, locales } from "./dictionaries"

interface I18nContextType {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: Dictionary
}

const I18nContext = createContext<I18nContextType | null>(null)

function getInitialLocale(): Locale {
  if (typeof window === "undefined") return "zh-CN"
  const stored = localStorage.getItem("locale") as Locale | null
  if (stored && locales.some((l) => l.value === stored)) return stored
  // Detect browser language
  const browserLang = navigator.language
  if (browserLang.startsWith("ja")) return "ja"
  if (browserLang.startsWith("zh")) return "zh-CN"
  if (browserLang.startsWith("en")) return "en"
  return "zh-CN"
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("zh-CN")

  useEffect(() => {
    setLocaleState(getInitialLocale())
  }, [])

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale)
    localStorage.setItem("locale", newLocale)
    document.cookie = `locale=${newLocale};path=/;max-age=31536000;samesite=lax`
  }, [])

  const t = getDictionary(locale)

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error("useI18n must be used within I18nProvider")
  return ctx
}
