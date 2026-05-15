"use client"

import { useCallback, useEffect, useState } from "react"
import { useAuth } from "@/components/auth/auth-provider"
import { getBrowserClient } from "@/lib/supabase-browser"
import { cn } from "@/lib/utils"

interface SignatureData {
  signature_text: string
  signature_font: string
  signature_bold: boolean
  signature_italic: boolean
}

export function UserSignature() {
  const { user } = useAuth()
  const [sig, setSig] = useState<SignatureData | null>(null)

  const loadSignature = useCallback(async () => {
    if (!user) return
    try {
      const { data, error } = await getBrowserClient()
        .from("profiles")
        .select("signature_text, signature_font, signature_bold, signature_italic")
        .eq("id", user.id)
        .single()

      if (error || !data?.signature_text) {
        setSig(null)
        return
      }
      setSig(data as SignatureData)
    } catch {
      setSig(null)
    }
  }, [user])

  useEffect(() => {
    loadSignature()
    window.addEventListener("profile-updated", loadSignature)
    return () => window.removeEventListener("profile-updated", loadSignature)
  }, [loadSignature])

  if (!sig?.signature_text) return null

  const isKai = sig.signature_font === "kai"

  return (
    <span
      className={cn(
        "truncate text-sm text-muted-foreground select-none",
        sig.signature_bold && "font-bold",
        sig.signature_italic && "italic",
        sig.signature_font === "serif" && "font-serif",
        sig.signature_font === "mono" && "font-mono",
        sig.signature_font === "sans" && "font-sans"
      )}
      style={
        isKai
          ? { fontFamily: `"KaiTi", "STKaiti", "Yu Mincho", serif` }
          : undefined
      }
    >
      {sig.signature_text}
    </span>
  )
}
