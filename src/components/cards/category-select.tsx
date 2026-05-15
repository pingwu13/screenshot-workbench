"use client"

import { useCallback, useEffect, useState } from "react"
import { useAuth } from "@/components/auth/auth-provider"
import { authFetch } from "@/lib/api-client"
import { getCategoryColorClass, CATEGORY_COLORS } from "@/lib/category-colors"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Plus, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface CategoryData {
  id: string; name: string; color: string; sort_order: number
}

interface CategorySelectProps {
  value: string
  onChange: (value: string) => void
  showAdd?: boolean
}

export function CategorySelect({ value, onChange, showAdd = true }: CategorySelectProps) {
  const { user } = useAuth()
  const [categories, setCategories] = useState<CategoryData[]>(() => {
    if (typeof window !== "undefined") {
      const c = (window as any).__catCache
      if (c) return c
    }
    return []
  })
  const [loading, setLoading] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [newName, setNewName] = useState("")
  const [newColor, setNewColor] = useState("gray")
  const [adding, setAdding] = useState(false)
  const [addErr, setAddErr] = useState("")

  const loadCategories = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const res = await authFetch("/api/categories")
      if (res.ok) {
        const data = await res.json()
        setCategories(data)
        ;(window as any).__catCache = data
      }
    } catch {} finally { setLoading(false) }
  }, [user])

  useEffect(() => { loadCategories() }, [loadCategories])
  useEffect(() => {
    const handler = () => loadCategories()
    window.addEventListener("categories-updated", handler)
    return () => window.removeEventListener("categories-updated", handler)
  }, [loadCategories])

  const handleAdd = async () => {
    const name = newName.trim()
    if (!name || name.length > 20) { setAddErr("1-20个字符"); return }
    setAdding(true); setAddErr("")
    try {
      const res = await authFetch("/api/categories", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, color: newColor }),
      })
      if (!res.ok) {
        const d = await res.json()
        setAddErr(d.error || "新增失败")
        return
      }
      const created = await res.json()
      await loadCategories()
      window.dispatchEvent(new Event("categories-updated"))
      onChange(created.name)
      setAddOpen(false)
      setNewName(""); setNewColor("gray")
    } catch { setAddErr("新增失败") }
    finally { setAdding(false) }
  }

  return (
    <>
      <div className="flex gap-1.5">
        <Select value={value || ""} onValueChange={(v) => onChange(v || "")}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="选择分类">
              {value && categories.find((c) => c.name === value) ? (
                <span className={cn("px-1.5 py-0.5 rounded text-xs", getCategoryColorClass(categories.find((c) => c.name === value)!.color))}>
                  {value}
                </span>
              ) : value ? value : undefined}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">未分类</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.name}>
                <span className={cn("px-1.5 py-0.5 rounded text-xs", getCategoryColorClass(c.color))}>{c.name}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {showAdd && (
          <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={() => { setNewName(""); setNewColor("gray"); setAddErr(""); setAddOpen(true) }}>
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>新增分类</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>分类名称</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="输入分类名称" maxLength={20} autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label>分类颜色</Label>
              <div className="grid grid-cols-6 gap-1.5">
                {CATEGORY_COLORS.map((clr) => (
                  <button key={clr} type="button" onClick={() => setNewColor(clr)}
                    className={cn(
                      "h-7 rounded-md border text-xs transition-colors",
                      getCategoryColorClass(clr),
                      newColor === clr && "ring-2 ring-black scale-110"
                    )} />
                ))}
              </div>
            </div>
            {addErr && <p className="text-sm text-destructive">{addErr}</p>}
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setAddOpen(false)}>取消</Button>
              <Button size="sm" onClick={handleAdd} disabled={adding}>
                {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "确认新增"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
