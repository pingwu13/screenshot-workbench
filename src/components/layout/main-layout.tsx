"use client"

import { useState } from "react"
import Link from "next/link"
import { Sidebar } from "@/components/layout/sidebar"
import { UserSignature } from "@/components/layout/user-signature"
import { LanguageSwitcher } from "@/components/layout/language-switcher"
import { DailyCheckInButton } from "@/components/checkin/daily-checkin-button"
import { AnnouncementButton } from "@/components/announcements/announcement-button"
import { AnnouncementProvider } from "@/components/announcements/announcement-provider"
import { CheckInCalendarDialog } from "@/components/checkin/checkin-calendar-dialog"
import { useAuth } from "@/components/auth/auth-provider"
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { Toaster } from "@/components/ui/sonner"
import { useI18n } from "@/i18n/context"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { AppAppearanceLoader } from "@/components/layout/app-appearance-loader"
import { LogOut, Settings, User, UserRound, CalendarCheck } from "lucide-react"

function UserMenu({ onOpenCalendar }: { onOpenCalendar: () => void }) {
  const { user, logout } = useAuth()
  const { t } = useI18n()
  if (!user) return null

  const displayName = user.user_metadata?.display_name as string | undefined
  const avatarUrl = user.user_metadata?.avatar_url as string | undefined

  const handleLogout = async () => {
    await logout()
    window.location.href = "/auth/login"
  }

  const handleSwitchAccount = async () => {
    await logout()
    window.location.href = "/auth/login"
  }

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger className="inline-flex items-center gap-2 px-2 py-1 rounded-md hover:bg-accent text-sm">
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="h-5 w-5 rounded-full object-cover" />
        ) : (
          <UserRound className="h-4 w-4" />
        )}
        <span className="max-w-[120px] truncate">{displayName || user.email}</span>
      </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom">{t.tooltips.settings}</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end" className="w-48">
        <div className="px-2 py-1.5">
          <p className="text-sm font-medium truncate">{displayName || "未设置昵称"}</p>
          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onOpenCalendar} className="gap-2">
          <CalendarCheck className="h-3.5 w-3.5" />
          每日签到
        </DropdownMenuItem>
        <Link href="/settings/profile">
          <DropdownMenuItem className="gap-2">
            <Settings className="h-3.5 w-3.5" />
            个人设置
          </DropdownMenuItem>
        </Link>
        <DropdownMenuItem onClick={handleSwitchAccount} className="gap-2">
          <User className="h-3.5 w-3.5" />
          切换账号
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="gap-2 text-destructive">
          <LogOut className="h-3.5 w-3.5" />
          登出
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function MainLayout({ children }: { children: React.ReactNode }) {
  const [calendarOpen, setCalendarOpen] = useState(false)

  return (
    <TooltipProvider>
      <AnnouncementProvider>
      <AppAppearanceLoader>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <div className="flex items-center justify-between h-12 px-4 border-b gap-4">
            <div className="flex-1 min-w-0 max-w-[min(38vw,520px)]">
              <UserSignature />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <DailyCheckInButton />
              <LanguageSwitcher />
              <AnnouncementButton />
              <UserMenu onOpenCalendar={() => setCalendarOpen(true)} />
            </div>
          </div>
          <div className="p-6 max-w-[1600px] mx-auto w-full">{children}</div>
        </main>
      </div>
      </AppAppearanceLoader>
      <Toaster />
      <CheckInCalendarDialog open={calendarOpen} onOpenChange={setCalendarOpen} />
      </AnnouncementProvider>
    </TooltipProvider>
  )
}
