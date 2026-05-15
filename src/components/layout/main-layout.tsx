"use client"

import Link from "next/link"
import { Sidebar } from "@/components/layout/sidebar"
import { LanguageSwitcher } from "@/components/layout/language-switcher"
import { useAuth } from "@/components/auth/auth-provider"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "@/components/ui/sonner"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { LogOut, Settings, User, UserRound } from "lucide-react"

function UserMenu() {
  const { user, logout } = useAuth()
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
      <DropdownMenuTrigger className="inline-flex items-center gap-2 px-2 py-1 rounded-md hover:bg-accent text-sm">
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="h-5 w-5 rounded-full object-cover" />
        ) : (
          <UserRound className="h-4 w-4" />
        )}
        <span className="max-w-[120px] truncate">{displayName || user.email}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <div className="px-2 py-1.5">
          <p className="text-sm font-medium truncate">{displayName || "未设置昵称"}</p>
          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
        </div>
        <DropdownMenuSeparator />
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
  return (
    <TooltipProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <div className="flex items-center justify-between h-12 px-4 border-b">
            <div />
            <div className="flex items-center gap-2">
              <LanguageSwitcher />
              <UserMenu />
            </div>
          </div>
          <div className="p-6 max-w-[1600px] mx-auto w-full">{children}</div>
        </main>
      </div>
      <Toaster />
    </TooltipProvider>
  )
}
