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

    // Remove old theme classes
    root.classList.remove("app-theme-light", "app-theme-black", "app-theme-grass", "app-theme-brown")
    root.classList.remove("app-font-songti", "app-font-kaiti", "app-font-fzxiaobiaosong", "app-font-yahei")

    const theme = data?.app_background_theme || "light"
    const font = data?.app_font_family || "yahei"

    root.classList.add(`app-theme-${theme}`)
    root.classList.add(`app-font-${font}`)
  }, [user])

  useEffect(() => {
    applySettings()
    window.addEventListener("app-settings-updated", applySettings)
    return () => window.removeEventListener("app-settings-updated", applySettings)
  }, [applySettings])

  return <>{children}</>
}
