"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react"
import { User } from "@supabase/supabase-js"
import { getBrowserClient } from "@/lib/supabase-browser"

export type AuthMode = "login" | "register" | "verifyOtp"

interface AuthContextType {
  user: User | null
  loading: boolean
  error: string | null
  authMode: AuthMode
  setAuthMode: (mode: AuthMode) => void
  pendingEmail: string
  pendingPassword: string
  login: (email: string, password: string) => Promise<{ error?: string }>
  register: (
    email: string,
    password: string,
    displayName: string
  ) => Promise<{ error?: string; needsOtp?: boolean }>
  verifyOtp: (email: string, token: string, type: "signup") => Promise<{ error?: string }>
  resendOtp: (email: string) => Promise<{ error?: string }>
  refreshUser: () => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [authMode, setAuthMode] = useState<AuthMode>("login")
  const [pendingEmail, setPendingEmail] = useState("")
  const [pendingPassword, setPendingPassword] = useState("")
  const ready = useRef(false)

  useEffect(() => {
    if (ready.current) return
    ready.current = true

    let cancelled = false
    const safetyTimer = setTimeout(() => {
      if (!cancelled) {
        console.warn("[Auth] Safety timeout — forcing ready state")
        setLoading(false)
        setError("初始化超时，请刷新重试")
      }
    }, 5000)

    async function init() {
      try {
        const client = getBrowserClient()
        const { data, error: sessionError } = await client.auth.getSession()

        if (cancelled) return
        clearTimeout(safetyTimer)

        if (sessionError) {
          console.error("[Auth] getSession error:", sessionError.message)
          setError(sessionError.message)
        } else {
          console.log("[Auth] getSession OK, user:", data.session?.user?.email || "null")
          setUser(data.session?.user || null)
        }
        setLoading(false)
      } catch (err) {
        if (cancelled) return
        clearTimeout(safetyTimer)
        const msg = err instanceof Error ? err.message : String(err)
        console.error("[Auth] init failed:", msg)
        setError(msg)
        setLoading(false)
      }
    }

    init()

    // Subscribe to auth changes
    const { data: listener } = getBrowserClient().auth.onAuthStateChange((event, session) => {
      console.log("[Auth] event:", event, "user:", session?.user?.email || "null")
      setUser(session?.user || null)
      if (event === "SIGNED_IN") setAuthMode("login")
    })

    return () => {
      cancelled = true
      clearTimeout(safetyTimer)
      listener?.subscription?.unsubscribe()
    }
  }, [])

  const getClient = useCallback(() => {
    try { return getBrowserClient() } catch { return null }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const client = getClient()
    if (!client) return { error: "客户端未初始化" }
    const { data, error: loginError } = await client.auth.signInWithPassword({ email, password })
    if (loginError) {
      if (loginError.message?.includes("Email not confirmed")) {
        setPendingEmail(email)
        setPendingPassword(password)
        setAuthMode("verifyOtp")
        return { error: "邮箱尚未验证，请输入邮件中的验证码完成验证。" }
      }
      return { error: loginError.message === "Invalid login credentials" ? "邮箱或密码错误" : loginError.message }
    }
    if (data.user) setUser(data.user)
    console.log("[Auth] login OK:", data.user?.email)
    return {}
  }, [getClient])

  const register = useCallback(async (email: string, password: string, displayName: string) => {
    const client = getClient()
    if (!client) return { error: "客户端未初始化" }
    const { data, error: signUpError } = await client.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    })
    if (signUpError) return { error: signUpError.message }
    setPendingEmail(email)
    setPendingPassword(password)
    setAuthMode("verifyOtp")
    return { needsOtp: true }
  }, [getClient])

  const verifyOtp = useCallback(async (email: string, token: string, type: "signup") => {
    const client = getClient()
    if (!client) return { error: "客户端未初始化" }
    const { data, error: otpError } = await client.auth.verifyOtp({ email, token, type })
    if (otpError) {
      return { error: otpError.message === "Invalid otp" ? "验证码错误或已过期" : otpError.message }
    }
    if (pendingPassword) {
      await client.auth.signInWithPassword({ email, password: pendingPassword })
    }
    return {}
  }, [getClient, pendingPassword])

  const resendOtp = useCallback(async (email: string) => {
    const client = getClient()
    if (!client) return { error: "客户端未初始化" }
    const { error: resendError } = await client.auth.resend({ email, type: "signup" })
    if (resendError) return { error: resendError.message }
    return {}
  }, [getClient])

  const refreshUser = useCallback(async () => {
    const client = getClient()
    if (!client) return
    const { data } = await client.auth.getUser()
    if (data.user) setUser(data.user)
  }, [getClient])

  const logout = useCallback(async () => {
    const client = getClient()
    if (client) await client.auth.signOut()
    setUser(null)
    setAuthMode("login")
    setPendingEmail("")
    setPendingPassword("")
    setError(null)
  }, [getClient])

  return (
    <AuthContext.Provider
      value={{
        user, loading, error, authMode, setAuthMode,
        pendingEmail, pendingPassword,
        login, register, verifyOtp, resendOtp, refreshUser, logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
