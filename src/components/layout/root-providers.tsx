"use client"

import { I18nProvider } from "@/i18n/context"
import { AuthProvider } from "@/components/auth/auth-provider"

export function RootProviders({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider>
      <AuthProvider>
        {children}
      </AuthProvider>
    </I18nProvider>
  )
}
