"use client"

import { useCallback, useEffect, useState } from "react"
import { useAuth } from "@/components/auth/auth-provider"
import { getBrowserClient } from "@/lib/supabase-browser"
import { getLocalDateString } from "@/lib/date"
import { dailyQuotes, DailyQuote } from "@/data/daily-quotes"
import { Button } from "@/components/ui/button"
import { Sparkles } from "lucide-react"
import { CheckInToast } from "@/components/checkin/checkin-toast"

export function DailyCheckInButton() {
  const { user } = useAuth()
  const [todayQuote, setTodayQuote] = useState<DailyQuote | null>(null)
  const [checkedIn, setCheckedIn] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [loading, setLoading] = useState(false)

  const today = getLocalDateString()

  // Check today's checkin on mount
  useEffect(() => {
    if (!user) return
    getBrowserClient()
      .from("daily_checkins")
      .select("quote_id, quote_text, quote_category, quote_source")
      .eq("user_id", user.id)
      .eq("checkin_date", today)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) console.error("[CheckIn] query error:", error.code, error.message)
        if (!error && data) {
          setCheckedIn(true)
          setTodayQuote({
            id: data.quote_id,
            text: data.quote_text,
            category: data.quote_category as DailyQuote["category"],
            source: data.quote_source,
            language: data.quote_category === "proverb" || data.quote_category === "programming" ? "en" : "zh",
          })
        }
      })
  }, [user, today])

  const handleCheckIn = useCallback(async () => {
    if (!user) { alert("请先登录"); return }

    // Debug: verify auth state
    const client = getBrowserClient()
    const { data: authData } = await client.auth.getUser()
    console.log("[CheckIn] auth.user.id:", authData.user?.id)
    console.log("[CheckIn] useAuth user.id:", user.id)

    // Already checked in — show today's quote
    if (checkedIn && todayQuote) {
      setShowToast(true)
      return
    }

    setLoading(true)
    try {
      const quote = dailyQuotes[Math.floor(Math.random() * dailyQuotes.length)]

      const payload = {
        user_id: user.id,
        checkin_date: today,
        quote_id: quote.id,
        quote_text: quote.text,
        quote_category: quote.category,
        quote_source: quote.source ?? "",
      }
      console.log("[CheckIn] insert payload:", payload)

      const { error } = await client.from("daily_checkins").insert(payload)

      if (error) {
        console.error("[CheckIn] insert error:", error.code, error.message, error.details)
        if (error.code === "23505") {
          setCheckedIn(true)
        } else {
          alert(`打卡失败: ${error.message}`)
        }
        return
      }

      setCheckedIn(true)
      setTodayQuote(quote)
      setShowToast(true)
    } catch (err) {
      console.error("[CheckIn] exception:", err)
    } finally {
      setLoading(false)
    }
  }, [user, checkedIn, todayQuote, today])

  return (
    <>
      <Button
        variant={checkedIn ? "ghost" : "outline"}
        size="sm"
        className="gap-1"
        onClick={handleCheckIn}
        disabled={loading}
      >
        <Sparkles className="h-3.5 w-3.5" />
        {checkedIn ? "已打卡" : "每日打卡"}
      </Button>

      {showToast && todayQuote && (
        <CheckInToast
          quote={todayQuote}
          onClose={() => setShowToast(false)}
        />
      )}
    </>
  )
}
