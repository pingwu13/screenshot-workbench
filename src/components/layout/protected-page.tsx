"use client"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/components/auth/auth-provider"
import { MainLayout } from "@/components/layout/main-layout"

function LoadingScreen({ text = "加载中..." }: { text?: string }) {
  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="text-center space-y-3">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-muted-foreground">{text}</p>
      </div>
    </div>
  )
}

export function ProtectedPage({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    console.log("[ProtectedPage]", { pathname, loading, hasUser: !!user, email: user?.email })
    if (!loading && !user) {
      const redirect = encodeURIComponent(pathname || "/")
      router.replace(`/auth/login?redirect=${redirect}`)
    }
  }, [loading, user, pathname, router])

  if (loading) return <LoadingScreen text="检查登录状态..." />

  if (!user) return <LoadingScreen text="未登录，正在跳转登录页..." />

  return <MainLayout>{children}</MainLayout>
}
