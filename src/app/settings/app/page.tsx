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
import { Loader2, Settings, Palette, Type, Trash2, RotateCcw, ChevronUp, ChevronDown, Pencil, Tag, Bot, Eye, EyeOff } from "lucide-react"
import { authFetch } from "@/lib/api-client"
import { getCategoryColorClass, CATEGORY_COLOR_OPTIONS } from "@/lib/category-colors"

const VALID_PROVIDERS = ["deepseek", "openai-compatible", "custom"]
import { cn } from "@/lib/utils"

interface CatItem2 { id: string; name: string; color: string; sort_order: number }

function CategoryManagement() {
  const [cats, setCats] = useState<CatItem2[]>([])
  const [newCatName, setNewCatName] = useState("")
  const [newCatColor, setNewCatColor] = useState("gray")
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [editColor, setEditColor] = useState("gray")

  const loadCats = useCallback(async () => {
    const res = await authFetch("/api/categories")
    if (res.ok) setCats(await res.json())
  }, [])

  useEffect(() => { loadCats() }, [loadCats])
  useEffect(() => {
    const h = () => loadCats()
    window.addEventListener("categories-updated", h)
    return () => window.removeEventListener("categories-updated", h)
  }, [loadCats])

  const addCat = async () => {
    const name = newCatName.trim()
    if (!name) { toast.error("名称不能为空"); return }
    setAdding(true)
    const res = await authFetch("/api/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, color: newCatColor }) })
    if (!res.ok) { toast.error("新增失败"); setAdding(false); return }
    toast.success(`已新增分类「${name}」`)
    setNewCatName(""); setNewCatColor("gray"); setAdding(false)
    await loadCats()
    window.dispatchEvent(new Event("categories-updated"))
  }

  const updateCat = async (id: string) => {
    const name = editName.trim()
    if (!name) { toast.error("名称不能为空"); return }
    const res = await authFetch(`/api/categories/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, color: editColor }) })
    if (!res.ok) { toast.error("修改失败"); return }
    toast.success("分类已更新")
    setEditingId(null)
    await loadCats()
    window.dispatchEvent(new Event("categories-updated"))
    window.dispatchEvent(new Event("cards-updated"))
  }

  const deleteCat = async (cat: CatItem2) => {
    if (!confirm(`删除分类「${cat.name}」？相关卡片将变为未分类。`)) return
    const res = await authFetch(`/api/categories/${cat.id}`, { method: "DELETE" })
    if (!res.ok) { toast.error("删除失败"); return }
    toast.success(`已删除分类「${cat.name}」，相关卡片已设为未分类`)
    await loadCats()
    window.dispatchEvent(new Event("categories-updated"))
    window.dispatchEvent(new Event("cards-updated"))
  }

  const moveCat = async (cat: CatItem2, dir: -1 | 1) => {
    const idx = cats.findIndex((c) => c.id === cat.id)
    if (idx === -1) return
    const target = cats[idx + dir]
    if (!target) return
    await authFetch(`/api/categories/${cat.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sort_order: target.sort_order }) })
    await authFetch(`/api/categories/${target.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sort_order: cat.sort_order }) })
    await loadCats()
    window.dispatchEvent(new Event("categories-updated"))
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-base flex items-center gap-2"><Tag className="h-4 w-4" />分类管理</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">管理新建卡片、资料库筛选和收集箱分类时使用的分类。</p>
        {cats.length === 0 ? (
          <p className="text-sm text-muted-foreground">暂无分类，请新增。</p>
        ) : (
          <div className="space-y-1">
            {cats.map((c, i) => (
              <div key={c.id} className="flex items-center gap-2 p-2 rounded-lg border">
                {editingId === c.id ? (
                  <>
                    <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-8 w-32" maxLength={20} />
                    <select value={editColor} onChange={(e) => setEditColor(e.target.value)} className="h-8 rounded border px-1 text-xs">
                      {CATEGORY_COLOR_OPTIONS.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                    </select>
                    <Button size="sm" onClick={() => updateCat(c.id)}>保存</Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>取消</Button>
                  </>
                ) : (
                  <>
                    <span className={cn("px-2 py-0.5 rounded text-xs font-medium", getCategoryColorClass(c.color))}>{c.name}</span>
                    <span className="text-xs text-muted-foreground flex-1" />
                    <Button size="icon" variant="ghost" className="h-6 w-6" disabled={i === 0} onClick={() => moveCat(c, -1)}><ChevronUp className="h-3 w-3" /></Button>
                    <Button size="icon" variant="ghost" className="h-6 w-6" disabled={i === cats.length - 1} onClick={() => moveCat(c, 1)}><ChevronDown className="h-3 w-3" /></Button>
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => { setEditingId(c.id); setEditName(c.name); setEditColor(c.color) }}><Pencil className="h-3 w-3" /></Button>
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => deleteCat(c)}><Trash2 className="h-3 w-3" /></Button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <Input value={newCatName} onChange={(e) => setNewCatName(e.target.value)} placeholder="新分类名称" maxLength={20} className="h-8 w-40" />
          <select value={newCatColor} onChange={(e) => setNewCatColor(e.target.value)} className="h-8 rounded border px-1 text-xs">
            {CATEGORY_COLOR_OPTIONS.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
          </select>
          <Button size="sm" onClick={addCat} disabled={adding}>{adding ? "..." : "新增分类"}</Button>
        </div>
      </CardContent>
    </Card>
  )
}

function AISettings() {
  const [provider, setProvider] = useState("deepseek")
  const [baseUrl, setBaseUrl] = useState("https://api.deepseek.com")
  const [apiKeyInput, setApiKeyInput] = useState("")
  const [showKey, setShowKey] = useState(false)
  const [model, setModel] = useState("deepseek-chat")
  const [thinkMode, setThinkMode] = useState(false)
  const [thinkLevel, setThinkLevel] = useState("medium")
  const [multiTurn, setMultiTurn] = useState(true)
  const [contextRounds, setContextRounds] = useState("8")
  const [hasSavedKey, setHasSavedKey] = useState(false)
  const [keyPreview, setKeyPreview] = useState("")
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)

  // Load settings on mount
  useEffect(() => {
    authFetch("/api/ai/settings").then(async (r) => {
      if (!r.ok) return
      const d = await r.json()
      setProvider(d.provider || "deepseek")
      setBaseUrl(d.base_url || "https://api.deepseek.com")
      setModel(d.model || "deepseek-chat")
      setThinkMode(d.reasoning_enabled || false)
      setThinkLevel(d.reasoning_strength || "medium")
      setMultiTurn(d.multi_turn_enabled ?? true)
      setContextRounds(String(d.context_message_limit || 8))
      setHasSavedKey(d.has_api_key)
      setKeyPreview(d.api_key_preview || "")
    }).catch(() => {})
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const body: Record<string, unknown> = {
        provider, base_url: baseUrl, model,
        reasoning_enabled: thinkMode, reasoning_strength: thinkLevel,
        multi_turn_enabled: multiTurn, context_message_limit: parseInt(contextRounds) || 8,
      }
      // Only send api_key if user typed something new
      if (apiKeyInput.trim()) body.api_key = apiKeyInput.trim()

      const res = await authFetch("/api/ai/settings", {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      })
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || "保存失败") }
      const d = await res.json()
      setHasSavedKey(d.has_api_key)
      setKeyPreview(d.api_key_preview || "")
      setApiKeyInput("")
      window.dispatchEvent(new Event("ai-settings-updated"))
      toast.success("AI 设置已保存")
    } catch (err: any) { toast.error(err.message || "保存失败") }
    finally { setSaving(false) }
  }

  const handleClearKey = async () => {
    if (!confirm("确定清除已保存的 API Key 吗？")) return
    try {
      const res = await authFetch("/api/ai/settings", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: "__CLEAR__" }),
      })
      if (!res.ok) throw new Error("清除失败")
      setHasSavedKey(false)
      setKeyPreview("")
      setApiKeyInput("")
      toast.success("API Key 已清除")
    } catch { toast.error("清除失败") }
  }

  const handleTest = async () => {
    setTesting(true)
    try {
      const res = await authFetch("/api/ai/test-connection", { method: "POST" })
      const d = await res.json()
      if (d.ok) { toast.success("连接成功") }
      else { toast.error(d.error || "连接失败") }
    } catch { toast.error("测试请求失败") }
    finally { setTesting(false) }
  }

  // Model options based on provider
  const modelOptions = provider === "deepseek" ? [
    { value: "deepseek-chat", label: "DeepSeek Chat：适合普通对话和任务处理" },
    { value: "deepseek-reasoner", label: "DeepSeek Reasoner：适合需要更强推理的问题" },
  ] : null

  return (
    <Card>
      <CardHeader><CardTitle className="text-base flex items-center gap-2"><Bot className="h-4 w-4" />AI 设置</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label>API 服务商</Label>
          <select value={provider} onChange={(e) => setProvider(e.target.value)} className="w-full h-8 rounded-md border border-input bg-background px-2.5 text-sm">
            <option value="deepseek">DeepSeek</option>
            <option value="openai-compatible">OpenAI 兼容接口</option>
            <option value="custom">自定义 OpenAI-Compatible API</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>API Base URL</Label>
          <Input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://api.deepseek.com" />
        </div>
        <div className="space-y-1.5">
          <Label>API Key</Label>
          {hasSavedKey && !apiKeyInput && (
            <p className="text-xs text-muted-foreground">已保存 API Key：{keyPreview}</p>
          )}
          <div className="flex gap-2">
            <Input type={showKey ? "text" : "password"} value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder={hasSavedKey ? "输入新 Key 以替换" : "sk-..."} className="flex-1" />
            <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={() => setShowKey(!showKey)}>
              {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground">API Key 仅用于服务端调用 AI，不会暴露到浏览器。</p>
          {hasSavedKey && (
            <Button variant="ghost" size="sm" className="text-destructive h-7 text-xs" onClick={handleClearKey}>清除 API Key</Button>
          )}
        </div>
        <div className="space-y-1.5">
          <Label>模型选择</Label>
          {modelOptions ? (
            <select value={model} onChange={(e) => setModel(e.target.value)} className="w-full h-8 rounded-md border border-input bg-background px-2.5 text-sm">
              {modelOptions.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
            </select>
          ) : (
            <Input value={model} onChange={(e) => setModel(e.target.value)} placeholder="输入模型名" />
          )}
        </div>
        <div className="flex items-center justify-between">
          <div><Label className="text-sm">思考模式</Label><p className="text-[10px] text-muted-foreground">启用后优先使用支持推理的模型</p></div>
          <input type="checkbox" checked={thinkMode} onChange={(e) => setThinkMode(e.target.checked)} className="rounded" />
        </div>
        <div className="space-y-1.5">
          <Label>思考强度</Label>
          <select value={thinkLevel} onChange={(e) => setThinkLevel(e.target.value)} className="w-full h-8 rounded-md border border-input bg-background px-2.5 text-sm">
            <option value="low">低：更快，适合简单问答</option>
            <option value="medium">中：平衡速度和质量</option>
            <option value="high">高：更充分，适合复杂任务拆解</option>
          </select>
        </div>
        <div className="flex items-center justify-between">
          <div><Label className="text-sm">多轮对话上下文</Label><p className="text-[10px] text-muted-foreground">开启后 AI 会参考当前会话历史</p></div>
          <input type="checkbox" checked={multiTurn} onChange={(e) => setMultiTurn(e.target.checked)} className="rounded" />
        </div>
        <div className="space-y-1.5">
          <Label>上下文轮数</Label>
          <select value={contextRounds} onChange={(e) => setContextRounds(e.target.value)} className="w-full h-8 rounded-md border border-input bg-background px-2.5 text-sm">
            {["4", "8", "12", "20"].map((v) => (<option key={v} value={v}>{v} 轮</option>))}
          </select>
          <p className="text-[10px] text-muted-foreground">发送给 AI 的最近历史消息数量</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={saving}>{saving ? "保存中..." : "保存 AI 设置"}</Button>
          <Button variant="outline" onClick={handleTest} disabled={testing}>{testing ? "测试中..." : "测试 AI 连接"}</Button>
        </div>
      </CardContent>
    </Card>
  )
}

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

        {/* Category Management */}
        <CategoryManagement />

        {/* AI Settings */}
        <AISettings />

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
