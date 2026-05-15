"use client"

import { Sidebar } from "@/components/layout/sidebar"
import { LanguageSwitcher } from "@/components/layout/language-switcher"
import { I18nProvider } from "@/i18n/context"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "@/components/ui/sonner"

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider>
      <TooltipProvider>
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-auto">
            <div className="flex items-center justify-end h-12 px-4 border-b">
              <LanguageSwitcher />
            </div>
            <div className="p-6 max-w-[1600px] mx-auto w-full">{children}</div>
          </main>
        </div>
        <Toaster />
      </TooltipProvider>
    </I18nProvider>
  )
}
