"use client"

import { useCallback, useEffect, useState } from "react"
import { ProtectedPage } from "@/components/layout/protected-page"
import { useAuth } from "@/components/auth/auth-provider"
import { getBrowserClient } from "@/lib/supabase-browser"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { Loader2, Settings, Palette, Type, Trash2, RotateCcw } from "lucide-react"

const BG_OPTIONS = [
  { value: "light", label: "浅色" },
  { value: "black", label: "深色" },
  { value: "grass", label: "草青色" },
  { value: "brown", label: "棕色" },
]

const FONT_OPTIONS = [
  { value: "yahei", label: "微软雅黑" },
  { value: "songti", label: "宋体" },
  { value: "kaiti", label: "楷体" },
  { value: "fzxiaobiaosong", label: "方正小标宋简体" },
]

const CLEANUP_DAYS = [30, 60, 180]

export default function AppSettingsPage() {
  const { user } = useAuth()
  const supabase = getBrowserClient()

  const [bgTheme, setBgTheme] = useState("light")
  const [fontFamily, setFontFamily] = useState("yahei")
  const [cleanupDays, setCleanupDays] = useState(60)
  const [savingAppearance, setSavingAppearance] = useState(false)

  // Cleanup state
  const [previewCount, setPreviewCount] = useState<number | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [confirmInput, setConfirmInput] = useState("")
  const [deleting, setDeleting] = useState(false)
  const [hasPreviewed, setHasPreviewed] = useState(false)

  // Reset
  const [resetting, setResetting] = useState(false)

  // Load settings
  useEffect(() => {
    if (!user) return
    supabase.from("profiles")
      .select("app_background_theme, app_font_family, card_cleanup_days")
      .eq("id", user.id).single()
      .then(({ data, error }) => {
        if (!error && data) {
          if (data.app_background_theme) setBgTheme(data.app_background_theme)
          if (data.app_font_family) setFontFamily(data.app_font_family)
          if (data.card_cleanup_days) setCleanupDays(data.card_cleanup_days)
        }
      })
  }, [user, supabase])

  // Save appearance
  const saveAppearance = useCallback(async () => {
    if (!user) return
    setSavingAppearance(true)
    try {
      await supabase.from("profiles").upsert({
        id: user.id, email: user.email,
        app_background_theme: bgTheme,
        app_font_family: fontFamily,
        updated_at: new Date().toISOString(),
      }, { onConflict: "id" })
      window.dispatchEvent(new Event("app-settings-updated"))
      toast.success("外观设置已保存")
    } catch { toast.error("保存失败") }
    finally { setSavingAppearance(false) }
  }, [user, bgTheme, fontFamily, supabase])

  // Save cleanup days (no deletion, just preference)
  const saveCleanupDays = useCallback(async () => {
    if (!user) return
    try {
      await supabase.from("profiles").upsert({
        id: user.id, email: user.email,
        card_cleanup_days: cleanupDays,
        updated_at: new Date().toISOString(),
      }, { onConflict: "id" })
      window.dispatchEvent(new Event("app-settings-updated"))
      toast.success("清理周期已保存")
    } catch { toast.error("保存失败") }
  }, [user, cleanupDays, supabase])

  // Preview deletion
  const previewDeletion = useCallback(async () => {
    if (!user) return
    setLoadingPreview(true)
    setConfirmInput("")
    setHasPreviewed(false)
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token
      const res = await fetch(`/api/cards/cleanup?days=${cleanupDays}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const data = await res.json()
      if (res.ok) {
        setPreviewCount(data.count)
        setHasPreviewed(true)
      } else {
        toast.error(data.error || "预览失败")
      }
    } catch { toast.error("预览失败") }
    finally { setLoadingPreview(false) }
  }, [user, cleanupDays, supabase])

  // Execute deletion
  const executeDeletion = useCallback(async () => {
    if (!user || confirmInput !== "DELETE") return
    setDeleting(true)
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token
      const res = await fetch("/api/cards/cleanup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ days: cleanupDays, confirmText: "DELETE" }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(`已删除 ${data.deleted} 张旧卡片`)
        setPreviewCount(null)
        setHasPreviewed(false)
        setConfirmInput("")
      } else {
        toast.error(data.error || "删除失败")
      }
    } catch { toast.error("删除失败") }
    finally { setDeleting(false) }
  }, [user, cleanupDays, confirmInput, supabase])

  // Reset defaults
  const resetDefaults = useCallback(async () => {
    if (!user || !confirm("确定要恢复默认设置吗？这不会删除任何数据。")) return
    setResetting(true)
    try {
      await supabase.from("profiles").upsert({
        id: user.id, email: user.email,
        app_background_theme: "light",
        app_font_family: "yahei",
        card_cleanup_days: 60,
        updated_at: new Date().toISOString(),
      }, { onConflict: "id" })
      setBgTheme("light")
      setFontFamily("yahei")
      setCleanupDays(60)
      window.dispatchEvent(new Event("app-settings-updated"))
      toast.success("已恢复默认设置")
    } catch { toast.error("恢复失败") }
    finally { setResetting(false) }
  }, [user, supabase])

  return (
    <ProtectedPage>
      <div className="max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><Settings className="h-6 w-6" />设置</h1>
          <p className="text-muted-foreground mt-1">调整网页外观和数据清理规则</p>
        </div>

        {/* Appearance */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Palette className="h-4 w-4" />外观设置</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>背景颜色</Label>
              <div className="flex gap-2 flex-wrap">
                {BG_OPTIONS.map((o) => (
                  <Button key={o.value} variant={bgTheme === o.value ? "default" : "outline"} size="sm" onClick={() => setBgTheme(o.value)}>{o.label}</Button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>页面字体</Label>
              <div className="flex gap-2 flex-wrap">
                {FONT_OPTIONS.map((o) => (
                  <Button key={o.value} variant={fontFamily === o.value ? "default" : "outline"} size="sm" onClick={() => setFontFamily(o.value)}>{o.label}</Button>
                ))}
              </div>
            </div>
            <div className="p-4 rounded-lg bg-muted/30 border space-y-2">
              <p className="text-xs text-muted-foreground">预览</p>
              <p className={`text-base ${fontFamily === "songti" ? "font-[SimSun,\"宋体\",serif]" : fontFamily === "kaiti" ? "font-[KaiTi,STKaiti,\"楷体\",serif]" : fontFamily === "fzxiaobiaosong" ? "font-[\"FZXiaoBiaoSong-B05S\",\"方正小标宋简体\",SimSun,serif]" : ""}`}>
                既然选择了远方，就只顾风雨兼程。
              </p>
              <p className="text-sm text-muted-foreground">Give a Chance!</p>
            </div>
            <Button onClick={saveAppearance} disabled={savingAppearance}>
              {savingAppearance ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}保存外观设置
            </Button>
          </CardContent>
        </Card>

        {/* Cleanup */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Trash2 className="h-4 w-4" />数据清理</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>删除多少天之前创建的卡片</Label>
              <div className="flex gap-2">
                {CLEANUP_DAYS.map((d) => (
                  <Button key={d} variant={cleanupDays === d ? "default" : "outline"} size="sm" onClick={() => { setCleanupDays(d); setPreviewCount(null); setHasPreviewed(false) }}>
                    {d} 天
                  </Button>
                ))}
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={saveCleanupDays}>保存默认清理周期</Button>

            <div className="border-t pt-4 space-y-3">
              <Button variant="outline" onClick={previewDeletion} disabled={loadingPreview}>
                {loadingPreview ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                预览将删除的卡片
              </Button>

              {previewCount !== null && (
                <div className="p-3 rounded-lg bg-destructive/10 space-y-3">
                  <p className="text-sm">
                    将删除 <strong>{cleanupDays} 天</strong>前创建的 <strong>{previewCount}</strong> 张卡片。
                    {previewCount > 0 && <span className="text-destructive font-medium"> 此操作不可撤销。</span>}
                  </p>
                  <div className="space-y-1.5">
                    <Label className="text-xs">输入 DELETE 确认删除</Label>
                    <div className="flex gap-2">
                      <Input value={confirmInput} onChange={(e) => setConfirmInput(e.target.value)} placeholder="DELETE" className="w-32" />
                      <Button variant="destructive" disabled={confirmInput !== "DELETE" || previewCount === 0 || deleting || !hasPreviewed} onClick={executeDeletion}>
                        {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                        删除旧卡片
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Reset — at the very bottom */}
        <Card className="border-dashed">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><RotateCcw className="h-4 w-4" />恢复默认设置</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              将背景颜色、页面字体和卡片清理周期恢复为系统默认值。不会删除任何卡片、头像、签到记录或账号数据。
            </p>
            <Button variant="outline" onClick={resetDefaults} disabled={resetting}>
              {resetting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              恢复默认设置
            </Button>
          </CardContent>
        </Card>
      </div>
    </ProtectedPage>
  )
}
