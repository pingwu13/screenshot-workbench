"use client"

import { useState, useEffect, useCallback } from "react"
import {
  ExternalLink, Grid3X3, Box, Plus, Pencil, Trash2, Globe,
  Monitor, Wrench, FileText, MoreHorizontal, Loader2,
} from "lucide-react"
import { Card as UICard, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ProtectedPage } from "@/components/layout/protected-page"
import { authFetch } from "@/lib/api-client"
import { CreativeShortcut, CreativeShortcutInput, ShortcutType } from "@/types/creative"
import { toast } from "sonner"
import Link from "next/link"

const SHORTCUT_TYPES: { value: ShortcutType; label: string; icon: typeof Globe }[] = [
  { value: "website", label: "网站", icon: Globe },
  { value: "software", label: "软件", icon: Monitor },
  { value: "tool", label: "工具", icon: Wrench },
  { value: "document", label: "文档", icon: FileText },
  { value: "other", label: "其他", icon: MoreHorizontal },
]

const DEFAULT_RECOMMENDATIONS = [
  { title: "DeepSeek", description: "深度求索 AI 大模型对话平台", type: "website" as const, url: "https://chat.deepseek.com" },
  { title: "GitHub", description: "全球最大的代码托管与协作平台", type: "tool" as const, url: "https://github.com" },
  { title: "Supabase", description: "开源 BaaS 平台，提供数据库、认证和存储", type: "tool" as const, url: "https://supabase.com" },
  { title: "Vercel", description: "前端部署平台，支持 Next.js 一键部署", type: "tool" as const, url: "https://vercel.com" },
]

const MINI_GAMES = [
  { id: "gomoku", name: "五子棋", description: "经典双人对弈，五子连珠即获胜", href: "/creative/gomoku" },
  { id: "tetris", name: "俄罗斯方块", description: "经典益智游戏，消行得分挑战", href: "/creative/tetris" },
]

const ICON_MAP: Record<string, typeof Globe> = {
  website: Globe, software: Monitor, tool: Wrench, document: FileText, other: MoreHorizontal,
}

function ShortcutFormDialog({
  open,
  onOpenChange,
  initial,
  onSave,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  initial?: CreativeShortcut
  onSave: (data: CreativeShortcutInput) => Promise<void>
}) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [type, setType] = useState<ShortcutType>("website")
  const [url, setUrl] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setTitle(initial?.title || "")
      setDescription(initial?.description || "")
      setType(initial?.type || "website")
      setUrl(initial?.url || "")
    }
  }, [open, initial])

  const handleSave = async () => {
    if (!title.trim()) return
    setSaving(true)
    try {
      await onSave({ title: title.trim(), description: description.trim(), type, url: url.trim() })
      onOpenChange(false)
    } catch {
      toast.error("保存失败")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? "编辑入口" : "新增入口"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>名称</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="例如：DeepSeek" />
          </div>
          <div className="space-y-1.5">
            <Label>描述</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="简短说明" rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>类型</Label>
              <Select value={type} onValueChange={(v) => setType(v as ShortcutType)}>
                <SelectTrigger><SelectValue>{SHORTCUT_TYPES.find((t) => t.value === type)?.label || type}</SelectValue></SelectTrigger>
                <SelectContent>
                  {SHORTCUT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>URL（可选）</Label>
              <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-3 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={handleSave} disabled={!title.trim() || saving}>
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
            保存
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default function CreativePage() {
  const [shortcuts, setShortcuts] = useState<CreativeShortcut[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<CreativeShortcut | undefined>()

  const fetchShortcuts = useCallback(async () => {
    try {
      const res = await authFetch("/api/creative/shortcuts")
      if (res.ok) setShortcuts(await res.json())
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchShortcuts() }, [fetchShortcuts])

  const handleCreate = async (data: CreativeShortcutInput) => {
    const res = await authFetch("/api/creative/shortcuts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || "Failed")
    }
    toast.success("已添加")
    await fetchShortcuts()
  }

  const handleUpdate = async (data: CreativeShortcutInput) => {
    if (!editing) return
    const res = await authFetch(`/api/creative/shortcuts/${editing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || "Failed")
    }
    toast.success("已更新")
    await fetchShortcuts()
  }

  const handleDelete = async (id: string) => {
    if (!confirm("确定删除这个入口吗？")) return
    const res = await authFetch(`/api/creative/shortcuts/${id}`, { method: "DELETE" })
    if (!res.ok) { toast.error("删除失败"); return }
    toast.success("已删除")
    await fetchShortcuts()
  }

  const handleAddRecommendation = async (rec: typeof DEFAULT_RECOMMENDATIONS[number]) => {
    await handleCreate(rec)
  }

  const isEmpty = !loading && shortcuts.length === 0

  return (
    <ProtectedPage>
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">创意栏</h1>
            <p className="text-muted-foreground mt-1">收纳你的快捷入口、灵感工具和小游戏。</p>
          </div>
          <Button size="sm" className="gap-1.5" onClick={() => { setEditing(undefined); setFormOpen(true) }}>
            <Plus className="h-4 w-4" />新增入口
          </Button>
        </div>

        {/* Shortcuts */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <ExternalLink className="h-5 w-5 text-muted-foreground" />
            快捷入口
          </h2>

          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {isEmpty && (
            <div className="space-y-4">
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">还没有快捷入口</p>
                <p className="text-xs mt-1 text-muted-foreground/60">点击右上角「新增入口」或从下方推荐添加</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-3">推荐入口：</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {DEFAULT_RECOMMENDATIONS.map((rec) => (
                    <UICard key={rec.title} className="rounded-xl">
                      <CardContent className="pt-5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-sm">{rec.title}</h3>
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{rec.description}</p>
                            <Badge variant="secondary" className="text-[10px] mt-1.5">
                              {SHORTCUT_TYPES.find((t) => t.value === rec.type)?.label || rec.type}
                            </Badge>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" className="w-full mt-3 gap-1.5"
                          onClick={() => handleAddRecommendation(rec)}>
                          <Plus className="h-3.5 w-3.5" />添加到我的创意栏
                        </Button>
                      </CardContent>
                    </UICard>
                  ))}
                </div>
              </div>
            </div>
          )}

          {!isEmpty && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {shortcuts.map((s) => {
                const Icon = ICON_MAP[s.type] || MoreHorizontal
                const typeLabel = SHORTCUT_TYPES.find((t) => t.value === s.type)?.label || s.type
                return (
                  <UICard key={s.id} className="rounded-xl hover:shadow-sm transition-shadow">
                    <CardContent className="pt-5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-sm">{s.title}</h3>
                            <Badge variant="secondary" className="text-[10px] h-5 gap-1">
                              <Icon className="h-3 w-3" />
                              {typeLabel}
                            </Badge>
                          </div>
                          {s.description && (
                            <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{s.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-0.5 shrink-0">
                          <Button variant="ghost" size="icon" className="h-7 w-7"
                            onClick={() => { setEditing(s); setFormOpen(true) }}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10"
                            onClick={() => handleDelete(s.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      {s.url && (
                        <a href={s.url} target="_blank" rel="noopener noreferrer" className="block mt-3">
                          <Button variant="outline" size="sm" className="w-full gap-1.5">
                            <ExternalLink className="h-3.5 w-3.5" />打开
                          </Button>
                        </a>
                      )}
                    </CardContent>
                  </UICard>
                )
              })}
            </div>
          )}
        </section>

        {/* Mini Games */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Grid3X3 className="h-5 w-5 text-muted-foreground" />
            小游戏
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {MINI_GAMES.map((game) => (
              <UICard key={game.id} className="rounded-xl hover:shadow-sm transition-shadow">
                <CardContent className="pt-5">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <Box className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm">{game.name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{game.description}</p>
                    </div>
                  </div>
                  <Link href={game.href} className="block mt-3">
                    <Button variant="outline" size="sm" className="w-full gap-1.5">启动</Button>
                  </Link>
                </CardContent>
              </UICard>
            ))}
          </div>
        </section>

        <ShortcutFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          initial={editing}
          onSave={editing ? handleUpdate : handleCreate}
        />
      </div>
    </ProtectedPage>
  )
}
