"use client"

import { useCallback, useEffect } from "react"
import { useAuth } from "@/components/auth/auth-provider"
import { getBrowserClient } from "@/lib/supabase-browser"

export function AppAppearanceLoader({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()

  const applySettings = useCallback(async () => {
    if (!user) return
    const { data } = await getBrowserClient()
      .from("profiles")
      .select("app_background_theme, app_font_family")
      .eq("id", user.id)
      .single()

    const root = document.documentElement

    // Remove old theme and font classes
    root.classList.remove("app-theme-light", "app-theme-black", "app-theme-grass", "app-theme-brown")
    root.classList.remove("app-font-songti", "app-font-kaiti", "app-font-fzxiaobiaosong", "app-font-yahei")

    const theme = data?.app_background_theme || "light"
    root.classList.add(`app-theme-${theme}`)

    if (data?.app_font_family) {
      // User explicitly set a font preference — respect it
      root.classList.add(`app-font-${data.app_font_family}`)
    } else {
      // No user preference — use locale-based default
      const locale = localStorage.getItem("locale") || "zh-CN"
      if (locale === "zh-CN") {
        root.classList.add("app-font-yahei")
      }
      // en / ja: leave Geist as the default (handled by CSS fallbacks)
    }
  }, [user])

  useEffect(() => {
    applySettings()
    window.addEventListener("app-settings-updated", applySettings)
    return () => window.removeEventListener("app-settings-updated", applySettings)
  }, [applySettings])

  return <>{children}</>
}
