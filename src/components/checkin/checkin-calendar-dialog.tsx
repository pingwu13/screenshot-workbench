"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useAuth } from "@/components/auth/auth-provider"
import { getBrowserClient } from "@/lib/supabase-browser"
import { getLocalDateString } from "@/lib/date"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ChevronLeft, ChevronRight, Check, X as XIcon } from "lucide-react"
import type { Card } from "@/types/card"

interface CheckInRecord {
  checkin_date: string
  quote_text: string
  quote_category: string
  quote_source: string
}

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"]
const CAT_LABELS: Record<string, string> = {
  classic: "古诗文", programming: "编程", proverb: "英语谚语",
}

export function CheckInCalendarDialog({ open, onOpenChange }: {
  open: boolean; onOpenChange: (open: boolean) => void
}) {
  const { user } = useAuth()
  const today = getLocalDateString()

  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [checkins, setCheckins] = useState<CheckInRecord[]>([])
  const [selectedDate, setSelectedDate] = useState<string>(today)
  const [dateCards, setDateCards] = useState<Card[]>([])
  const [loadingCards, setLoadingCards] = useState(false)

  const loadCheckins = useCallback(async () => {
    if (!user) return
    const start = `${year}-${String(month).padStart(2, "0")}-01`
    const end = `${year}-${String(month).padStart(2, "0")}-31`
    const { data } = await getBrowserClient()
      .from("daily_checkins")
      .select("checkin_date, quote_text, quote_category, quote_source")
      .eq("user_id", user.id).gte("checkin_date", start).lte("checkin_date", end)
      .order("checkin_date")
    if (data) setCheckins(data as CheckInRecord[])
  }, [user, year, month])

  const loadDateCards = useCallback(async (date: string) => {
    if (!user) return
    setLoadingCards(true)
    try {
      const token = (await getBrowserClient().auth.getSession()).data.session?.access_token
      const res = await fetch(`/api/cards?date=${date}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const json = await res.json()
      setDateCards(res.ok && Array.isArray(json) ? json : [])
    } catch { setDateCards([]) }
    finally { setLoadingCards(false) }
  }, [user])

  useEffect(() => {
    if (!open || !user) return
    const td = getLocalDateString(); const t = new Date()
    setYear(t.getFullYear()); setMonth(t.getMonth() + 1); setSelectedDate(td)
    loadDateCards(td)
  }, [open, user, loadDateCards])

  useEffect(() => { if (open) loadCheckins() }, [open, loadCheckins])

  const handleDateClick = (date: string) => { setSelectedDate(date); loadDateCards(date) }

  const checkinMap = useMemo(() => new Map(checkins.map((c) => [c.checkin_date, c])), [checkins])

  const firstDay = new Date(year, month - 1, 1).getDay()
  const daysInMonth = new Date(year, month, 0).getDate()
  const cells: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const prevMonth = () => {
    const m = month === 1 ? 12 : month - 1; const y = month === 1 ? year - 1 : year
    setYear(y); setMonth(m)
  }
  const nextMonth = () => {
    const m = month === 12 ? 1 : month + 1; const y = month === 12 ? year + 1 : year
    setYear(y); setMonth(m)
  }

  const isFutureDate = (d: number) => {
    const cd = new Date(year, month - 1, d); cd.setHours(23, 59, 59, 999)
    return cd > new Date()
  }

  const selectedCheckin = checkinMap.get(selectedDate)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!w-[75vw] !max-w-[75vw]">
        <DialogHeader>
          <DialogTitle>每日签到</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-6">
          {/* ===== LEFT: Calendar ===== */}
          <section className="rounded-3xl overflow-hidden border shadow-sm bg-amber-50 self-start">
            <div className="bg-rose-100 px-5 py-4">
              <div className="flex items-center justify-between">
                <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-white/60" onClick={prevMonth}>
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <span className="text-lg font-semibold text-rose-900">{year} 年 {month} 月</span>
                <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-white/60" onClick={nextMonth}>
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
            </div>

            <div className="px-5 py-5">
              <div className="grid grid-cols-7 gap-2 mb-3">
                {WEEKDAYS.map((d) => (
                  <div key={d} className="flex items-center justify-center">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-white/80 text-stone-600 text-sm font-medium">{d}</span>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-2">
                {cells.map((d, i) => {
                  if (d === null) return <div key={`e-${i}`} />
                  const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`
                  const record = checkinMap.get(dateStr)
                  const future = isFutureDate(d)
                  const isTodayDate = dateStr === today
                  const isSel = dateStr === selectedDate

                  return (
                    <button key={dateStr} type="button" onClick={() => handleDateClick(dateStr)}
                      className={cn(
                        "h-12 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-colors hover:bg-white/60",
                        isSel && "ring-2 ring-black bg-white",
                        isTodayDate && !isSel && "border border-rose-400 bg-rose-50/50"
                      )}>
                      {record && <Check className="h-3.5 w-3.5 text-green-600" strokeWidth={4} />}
                      {!record && !future && !isTodayDate && <XIcon className="h-3.5 w-3.5 text-red-400" strokeWidth={4} />}
                      {!record && isTodayDate && !isSel && <div className="h-3.5 w-3.5" />}
                      {future && <div className="h-3.5 w-3.5" />}
                      <span className={cn("text-sm font-medium", isSel ? "text-black" : "text-stone-700")}>{d}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </section>

          {/* ===== RIGHT: Date Detail ===== */}
          <section className="rounded-3xl border bg-white shadow-sm p-6">
            <p className="text-lg font-semibold mb-4">{selectedDate}</p>

            {/* Check-in status */}
            {selectedCheckin ? (
              <div className="p-4 rounded-xl bg-muted/50 space-y-2 mb-4">
                <span className="inline-block text-xs bg-muted px-2 py-0.5 rounded-full">
                  {CAT_LABELS[selectedCheckin.quote_category] || selectedCheckin.quote_category}
                </span>
                <p className="text-base">{selectedCheckin.quote_text}</p>
                {selectedCheckin.quote_source && (
                  <p className="text-xs text-muted-foreground">{selectedCheckin.quote_source}</p>
                )}
              </div>
            ) : selectedDate === today ? (
              <div className="p-4 rounded-xl bg-muted/30 border border-dashed text-center mb-4">
                <p className="text-sm text-muted-foreground">今天还没有打卡</p>
                <p className="text-xs text-muted-foreground mt-1">点击顶部"每日打卡"按钮获取今日金句</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground mb-4">未打卡</p>
            )}

            {/* Day tasks */}
            <p className="text-sm font-medium text-muted-foreground mb-2">当天任务</p>
            {loadingCards ? (
              <p className="text-sm text-muted-foreground">加载中...</p>
            ) : dateCards.length > 0 ? (
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {dateCards.map((card) => (
                  <a key={card.id} href={`/cards/${card.id}`} target="_blank" rel="noreferrer"
                    className="block p-2.5 rounded-lg border text-sm hover:bg-accent transition-colors">
                    <p className="font-medium truncate">{card.title || "未命名卡片"}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{card.type} · {card.status}</p>
                  </a>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center min-h-[180px] text-center">
                <div>
                  <p className="text-2xl font-bold text-muted-foreground/60">今日无事，勾栏听曲。</p>
                  <p className="text-sm text-muted-foreground mt-2">这一天没有创建或编辑任何卡片</p>
                </div>
              </div>
            )}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  )
}
