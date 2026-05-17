"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  Home,
  Inbox,
  LayoutGrid,
  Library,
  Plus,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Gamepad2,
  Settings,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useI18n } from "@/i18n/context"
import { useState } from "react"

export function Sidebar() {
  const pathname = usePathname()
  const { t } = useI18n()
  const [collapsed, setCollapsed] = useState(false)

  const NAV_ITEMS = [
    { href: "/", label: t.nav.home, icon: Home },
    { href: "/inbox", label: t.nav.inbox, icon: Inbox },
    { href: "/workbench", label: "工作台", icon: Sparkles },
    { href: "/board", label: t.nav.board, icon: LayoutGrid },
    { href: "/library", label: t.nav.library, icon: Library },
    { href: "/creative", label: "创意栏", icon: Gamepad2 },
    { href: "/settings/app", label: t.nav.settings, icon: Settings },
  ]

  return (
    <aside
      className={cn(
        "flex flex-col border-r bg-sidebar shrink-0 transition-all duration-200",
        collapsed ? "w-16" : "w-56"
      )}
    >
      <div className="flex items-center h-12 px-3 border-b">
        {!collapsed && (
          <h1 className="font-bold italic text-sm truncate">Give a Chance!</h1>
        )}
        <Button
          variant="ghost"
          size="icon"
          className={cn("shrink-0", collapsed ? "mx-auto" : "ml-auto")}
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      <div className="p-3">
        <Link href="/cards/new">
          <Button
            className={cn("w-full gap-2", collapsed && "px-2")}
            size={collapsed ? "icon" : "default"}
          >
            <Plus className="h-4 w-4" />
            {!collapsed && t.nav.newCard}
          </Button>
        </Link>
      </div>

      <Separator />

      <nav className="flex-1 p-2 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href)
          return collapsed ? (
            <Tooltip key={item.href}>
              <TooltipTrigger asChild>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center justify-center h-9 w-9 mx-auto rounded-md text-muted-foreground border-l-[3px] border-l-transparent hover:bg-accent hover:text-accent-foreground transition-colors",
                    isActive &&
                      "bg-primary/15 text-primary border-l-primary hover:bg-primary/20"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">{item.label}</TooltipContent>
            </Tooltip>
          ) : (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground border-l-[3px] border-l-transparent hover:bg-accent hover:text-accent-foreground transition-colors",
                isActive &&
                  "bg-primary/15 text-primary border-l-primary hover:bg-primary/20 font-semibold"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
