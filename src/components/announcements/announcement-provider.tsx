"use client"

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react"
import { AnnouncementWithRead, AnnouncementsResponse } from "@/types/announcement"
import { authFetch } from "@/lib/api-client"

interface AnnouncementContextValue {
  announcements: AnnouncementWithRead[]
  unreadCount: number
  loading: boolean
  markAsRead: (id: string) => Promise<void>
  refresh: () => Promise<void>
}

const AnnouncementContext = createContext<AnnouncementContextValue | null>(null)

export function AnnouncementProvider({ children }: { children: ReactNode }) {
  const [announcements, setAnnouncements] = useState<AnnouncementWithRead[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const res = await authFetch("/api/announcements")
      if (res.ok) {
        const data: AnnouncementsResponse = await res.json()
        setAnnouncements(data.announcements)
        setUnreadCount(data.unread_count)
      }
    } catch (err) {
      console.error("[Announcements] fetch failed:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const markAsRead = useCallback(async (id: string) => {
    // Optimistic update
    setAnnouncements((prev) =>
      prev.map((a) => (a.id === id ? { ...a, read: true } : a))
    )
    setUnreadCount((prev) => Math.max(0, prev - 1))

    try {
      const res = await authFetch(`/api/announcements/${id}/read`, { method: "POST" })
      if (!res.ok) {
        // Rollback on failure
        await refresh()
      }
    } catch {
      await refresh()
    }
  }, [refresh])

  return (
    <AnnouncementContext.Provider value={{ announcements, unreadCount, loading, markAsRead, refresh }}>
      {children}
    </AnnouncementContext.Provider>
  )
}

export function useAnnouncements() {
  const ctx = useContext(AnnouncementContext)
  if (!ctx) throw new Error("useAnnouncements must be used within AnnouncementProvider")
  return ctx
}
