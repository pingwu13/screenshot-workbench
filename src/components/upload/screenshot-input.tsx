"use client"

import { useState, useRef, useEffect, useCallback, DragEvent } from "react"
import { Plus, ClipboardPaste, Clipboard, X, Upload } from "lucide-react"
import { cn } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { toast } from "sonner"

const MAX_FILES = 9
const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"]

interface ScreenshotInputProps {
  onFilesChange: (files: File[]) => void
  existingUrls?: string[]
  className?: string
}

interface FileEntry {
  file: File
  previewUrl: string
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function ScreenshotInput({ onFilesChange, existingUrls, className }: ScreenshotInputProps) {
  const [entries, setEntries] = useState<FileEntry[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Stable ref for the parent callback to avoid effect re-fires
  const onFilesChangeRef = useRef(onFilesChange)
  onFilesChangeRef.current = onFilesChange

  // Ref to track entries for cleanup (avoids stale closure)
  const entriesRef = useRef(entries)
  entriesRef.current = entries

  const existingCount = (existingUrls || []).length
  const totalCount = existingCount + entries.length
  const canAdd = totalCount < MAX_FILES

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      entriesRef.current.forEach((e) => URL.revokeObjectURL(e.previewUrl))
    }
  }, [])

  // Notify parent when entries change (after render, not during)
  useEffect(() => {
    onFilesChangeRef.current(entries.map((e) => e.file))
  }, [entries])

  const addFiles = useCallback((files: File[]) => {
    const images = files.filter((f) => ACCEPTED_TYPES.includes(f.type))
    if (images.length === 0) {
      toast.error("仅支持 PNG、JPG、WebP 格式")
      return
    }

    const slotsLeft = MAX_FILES - totalCount
    if (slotsLeft <= 0) {
      toast.error(`最多只能添加 ${MAX_FILES} 张截图`)
      return
    }

    const toAdd = images.slice(0, slotsLeft)
    const newEntries: FileEntry[] = toAdd.map((f) => ({
      file: f,
      previewUrl: URL.createObjectURL(f),
    }))

    setEntries((prev) => [...prev, ...newEntries])

    if (images.length > slotsLeft) {
      toast.error(`最多只能添加 ${MAX_FILES} 张截图，已保留前 ${slotsLeft} 张`)
    }
  }, [totalCount])

  const removeEntry = useCallback((index: number) => {
    setEntries((prev) => {
      URL.revokeObjectURL(prev[index].previewUrl)
      return prev.filter((_, i) => i !== index)
    })
  }, [])

  const handleFileSelect = () => {
    setMenuOpen(false)
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(Array.from(e.target.files))
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const handlePasteHint = () => {
    setMenuOpen(false)
    toast.info("请使用 Cmd+V / Ctrl+V 粘贴截图")
  }

  const handleClipboardRead = async () => {
    setMenuOpen(false)
    try {
      const items = await navigator.clipboard.read()
      const files: File[] = []
      for (const item of items) {
        for (const type of item.types) {
          if (type.startsWith("image/")) {
            const blob = await item.getType(type)
            const file = new File([blob], `clipboard.${type.split("/")[1] || "png"}`, { type })
            files.push(file)
            break
          }
        }
      }
      if (files.length === 0) {
        toast.error("剪贴板中没有图片")
        return
      }
      addFiles(files)
    } catch {
      toast.error("无法读取剪贴板，请尝试直接 Cmd+V 粘贴")
    }
  }

  // Global paste handler
  const handlePaste = useCallback((e: ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return
    const files: File[] = []
    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile()
        if (file) files.push(file)
      }
    }
    if (files.length > 0) {
      e.preventDefault()
      addFiles(files)
    }
  }, [addFiles])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    el.addEventListener("paste", handlePaste)
    return () => el.removeEventListener("paste", handlePaste)
  }, [handlePaste])

  // Drag and drop
  const handleDragOver = (e: DragEvent) => { e.preventDefault(); setIsDragging(true) }
  const handleDragLeave = (e: DragEvent) => { e.preventDefault(); setIsDragging(false) }
  const handleDrop = (e: DragEvent) => {
    e.preventDefault(); setIsDragging(false)
    if (e.dataTransfer.files) addFiles(Array.from(e.dataTransfer.files))
  }

  return (
    <div
      ref={containerRef}
      className={cn("space-y-2", className)}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Existing URLs (edit mode) */}
      {existingUrls?.map((url, i) => (
        <div key={`existing-${i}`}
          className="flex items-center gap-3 px-3 py-2 rounded-lg border bg-muted/30">
          <div className="h-12 w-12 shrink-0 rounded-md overflow-hidden border bg-muted">
            <img src={url} alt="" className="h-full w-full object-cover" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm truncate">已上传截图 {i + 1}</p>
            <p className="text-xs text-muted-foreground">已关联到卡片</p>
          </div>
        </div>
      ))}

      {/* New file entries */}
      {entries.map((entry, i) => (
        <div key={`${entry.file.name}-${i}`}
          className="flex items-center gap-3 px-3 py-2 rounded-lg border bg-muted/30">
          <div className="h-12 w-12 shrink-0 rounded-md overflow-hidden border bg-muted">
            <img src={entry.previewUrl} alt="" className="h-full w-full object-cover" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm truncate">{entry.file.name}</p>
            <p className="text-xs text-muted-foreground">{formatFileSize(entry.file.size)}</p>
          </div>
          <button
            type="button"
            onClick={() => removeEntry(i)}
            className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-destructive transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}

      {/* Add button row */}
      {canAdd && (
        <Popover open={menuOpen} onOpenChange={setMenuOpen}>
          <PopoverTrigger
            className={cn(
              "flex items-center gap-2 w-full px-3 py-2.5 rounded-lg border text-sm text-muted-foreground transition-colors",
              isDragging
                ? "border-primary bg-primary/5 text-primary"
                : "border-dashed hover:border-primary/50 hover:text-foreground"
            )}
          >
            <span className="h-6 w-6 rounded-md border flex items-center justify-center shrink-0">
              <Plus className="h-3.5 w-3.5" />
            </span>
            <span>
              {entries.length === 0 && existingCount === 0
                ? "粘贴、拖入或选择截图"
                : `添加第 ${totalCount + 1} 张截图`}
            </span>
          </PopoverTrigger>
          <PopoverContent align="start" sideOffset={4} className="w-44 p-1.5">
            <button
              type="button"
              onClick={handleFileSelect}
              className="flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm hover:bg-muted transition-colors"
            >
              <Upload className="h-4 w-4" />
              上传照片
            </button>
            <button
              type="button"
              onClick={handlePasteHint}
              className="flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm hover:bg-muted transition-colors"
            >
              <ClipboardPaste className="h-4 w-4" />
              粘贴截图
            </button>
            <button
              type="button"
              onClick={handleClipboardRead}
              className="flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm hover:bg-muted transition-colors"
            >
              <Clipboard className="h-4 w-4" />
              从剪贴板读取
            </button>
          </PopoverContent>
        </Popover>
      )}

      {/* Limit reached */}
      {!canAdd && (
        <p className="text-xs text-muted-foreground text-center py-2">
          最多只能添加 {MAX_FILES} 张截图
        </p>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  )
}
