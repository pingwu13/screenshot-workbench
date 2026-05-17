"use client"

import { useState, useCallback } from "react"
import { Mail, Sprout, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog"
import { useAnnouncements } from "@/components/announcements/announcement-provider"
import { AnnouncementWithRead } from "@/types/announcement"

const LEVEL_CONFIG = {
  important: { dot: "bg-rose-400/80", badge: "重要" },
  info: { dot: "bg-sky-400/80", badge: "资讯" },
  normal: { dot: "bg-muted-foreground/30", badge: "" },
}

export function AnnouncementButton() {
  const { announcements, unreadCount, loading, markAsRead } = useAnnouncements()
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<AnnouncementWithRead | null>(null)

  const handleSelect = useCallback(async (a: AnnouncementWithRead) => {
    setSelected(a)
    setOpen(false)
    if (!a.read) await markAsRead(a.id)
  }, [markAsRead])

  const hasUnread = unreadCount > 0

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          className={cn(
            "relative inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors",
            open && "bg-accent text-accent-foreground"
          )}
        >
          {/* Leaf decoration */}
          <Sprout
            className={cn(
              "absolute -top-2.5 -right-1 h-4 w-4 transition-all duration-300",
              hasUnread
                ? "text-emerald-500/70 rotate-12"
                : "text-muted-foreground/10 rotate-0"
            )}
          />
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Mail className="h-4 w-4" />
          )}
          {/* Unread red dot */}
          {hasUnread && (
            <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-rose-400/80 ring-1 ring-background" />
          )}
        </PopoverTrigger>
        <PopoverContent align="end" sideOffset={6} className="w-80 p-0">
          <div className="px-4 py-3 border-b">
            <p className="text-sm font-medium">公告邮箱</p>
            {hasUnread && (
              <p className="text-xs text-muted-foreground mt-0.5">{unreadCount} 条未读</p>
            )}
            {!hasUnread && announcements.length > 0 && (
              <p className="text-xs text-muted-foreground mt-0.5">全部已读</p>
            )}
          </div>
          <div className="max-h-72 overflow-y-auto">
            {announcements.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                暂无公告
              </div>
            ) : (
              announcements.map((a) => {
                const levelCfg = LEVEL_CONFIG[a.level] || LEVEL_CONFIG.normal
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => handleSelect(a)}
                    className="w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors border-b last:border-b-0"
                  >
                    <div className="flex items-start gap-2">
                      {!a.read && (
                        <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", levelCfg.dot)} />
                      )}
                      <div className={cn("flex-1 min-w-0", a.read && "ml-4")}>
                        <div className="flex items-center gap-2">
                          <p className={cn("text-sm truncate", !a.read && "font-medium")}>
                            {a.title}
                          </p>
                          {levelCfg.badge && (
                            <span className={cn(
                              "text-[10px] px-1.5 py-px rounded-full shrink-0",
                              a.level === "important" && "bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400",
                              a.level === "info" && "bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400"
                            )}>
                              {levelCfg.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {a.summary}
                        </p>
                        <p className="text-[10px] text-muted-foreground/60 mt-1">
                          {a.created_at}
                        </p>
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-lg max-h-[70vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{selected?.title}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-3">
            <div className="flex items-center gap-2">
              <p className="text-xs text-muted-foreground">{selected?.created_at}</p>
              {selected && LEVEL_CONFIG[selected.level]?.badge && (
                <span className={cn(
                  "text-[10px] px-1.5 py-px rounded-full",
                  selected.level === "important" && "bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400",
                  selected.level === "info" && "bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400"
                )}>
                  {LEVEL_CONFIG[selected.level].badge}
                </span>
              )}
            </div>
            <div className="text-sm leading-relaxed whitespace-pre-wrap">
              {selected?.content}
            </div>
          </div>
          <div className="flex justify-end pt-3 border-t">
            <DialogClose className="inline-flex items-center justify-center rounded-md h-9 px-4 text-sm font-medium border bg-background hover:bg-accent transition-colors">
              关闭
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
