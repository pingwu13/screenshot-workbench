"use client"

import { useCallback, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { useAuth } from "@/components/auth/auth-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { Loader2, Mail, ArrowLeft } from "lucide-react"

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

export default function LoginPage() {
  const { user, loading: authLoading, logout, login, verifyOtp, resendOtp, authMode, setAuthMode, pendingEmail } = useAuth()
  const searchParams = useSearchParams()

  const [email, setEmail] = useState(pendingEmail || "")
  const [password, setPassword] = useState("")
  const [otpCode, setOtpCode] = useState("")
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [resendTimer, setResendTimer] = useState(0)

  const rawRedirect = searchParams.get("redirect")
  const redirectTo = rawRedirect && rawRedirect.startsWith("/") && !rawRedirect.startsWith("//") ? rawRedirect : "/"

  useEffect(() => {
    if (resendTimer <= 0) return
    const id = setInterval(() => setResendTimer((t) => Math.max(0, t - 1)), 1000)
    return () => clearInterval(id)
  }, [resendTimer])

  useEffect(() => { if (pendingEmail) setEmail(pendingEmail) }, [pendingEmail])

  const handleLogin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSubmitting(true)
    try {
      const r = await login(email, password)
      if (r.error) { setError(r.error); setSubmitting(false); return }
    } catch (err) { setError(String(err)); setSubmitting(false); return }
    window.location.href = redirectTo
  }, [email, password, login, redirectTo])

  const handleVerifyOtp = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (otpCode.length < 8) { setError("请输入完整 8 位验证码"); return }
    setSubmitting(true)
    const r = await verifyOtp(email, otpCode, "signup")
    if (r.error) { setError(r.error); setSubmitting(false); return }
    window.location.href = redirectTo
  }, [email, otpCode, verifyOtp, redirectTo])

  const handleResend = useCallback(async () => {
    if (resendTimer > 0) return
    setSubmitting(true)
    const r = await resendOtp(email)
    if (r.error) setError(r.error); else setResendTimer(60)
    setSubmitting(false)
  }, [email, resendOtp, resendTimer])

  const handleSwitchAccount = useCallback(async () => {
    await logout()
    setEmail("")
    setPassword("")
  }, [logout])

  // ---- RENDER ----

  if (authLoading) return <LoadingScreen text="检查登录状态..." />

  if (authMode === "verifyOtp") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="w-full max-w-sm space-y-6 p-8 bg-card rounded-xl border shadow-sm">
          <div className="text-center space-y-1">
            <Mail className="h-10 w-10 mx-auto text-primary" />
            <h1 className="text-xl font-bold">邮箱验证</h1>
            <p className="text-sm text-muted-foreground">请输入发送到 {email} 的验证码</p>
          </div>
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="otp">验证码</Label>
              <Input id="otp" value={otpCode} onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 8))} placeholder="输入 8 位验证码" maxLength={8} className="text-center text-lg tracking-widest" autoFocus />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={submitting}>{submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "验证"}</Button>
          </form>
          <div className="space-y-3">
            <button type="button" onClick={handleResend} disabled={resendTimer > 0 || submitting} className="w-full text-sm text-muted-foreground hover:text-primary disabled:opacity-50">
              {resendTimer > 0 ? `重新发送 (${resendTimer}s)` : "重新发送验证码"}
            </button>
            <button type="button" onClick={() => { setAuthMode("login"); setOtpCode(""); setError("") }} className="w-full flex items-center justify-center gap-1 text-sm text-muted-foreground hover:text-primary">
              <ArrowLeft className="h-3 w-3" />返回登录
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30">
      <div className="w-full max-w-sm space-y-6 p-8 bg-card rounded-xl border shadow-sm">
        <div className="text-center space-y-1">
          <h1 className="text-xl font-bold">登录</h1>
          <p className="text-sm text-muted-foreground">截图整理工作台</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">邮箱</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">密码</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : user ? "登录其他账号" : "登录"}
          </Button>
        </form>

        {!user && (
          <p className="text-center text-sm text-muted-foreground">
            还没有账号？ <Link href="/auth/register" className="text-primary hover:underline">注册</Link>
          </p>
        )}
      </div>
    </div>
  )
}
