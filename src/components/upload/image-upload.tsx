"use client"

import { useState, useRef, useEffect, DragEvent, useCallback } from "react"
import { Upload, Image as ImageIcon, ClipboardPaste, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { useI18n } from "@/i18n/context"

const MAX_FILES = 9

interface ImageUploadProps {
  onFilesChange: (files: File[]) => void
  existingUrls?: string[]
  className?: string
}

function PreviewItem({ src, onRemove }: { src: string; onRemove: () => void }) {
  return (
    <div className="relative h-20 w-20 shrink-0 rounded-md overflow-hidden border">
      <img src={src} alt="" className="h-full w-full object-cover" />
      <button type="button" onClick={(e) => { e.stopPropagation(); onRemove() }}
        className="absolute top-0.5 right-0.5 h-5 w-5 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70">
        <X className="h-3 w-3" />
      </button>
    </div>
  )
}

export function ImageUpload({ onFilesChange, existingUrls, className }: ImageUploadProps) {
  const { t } = useI18n()
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Cleanup object URLs
  useEffect(() => {
    return () => previews.forEach((u) => URL.revokeObjectURL(u))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const addFiles = useCallback((newFiles: File[]) => {
    const images = newFiles.filter((f) => f.type.startsWith("image/"))
    if (images.length === 0) return

    const combined = [...selectedFiles, ...images].slice(0, MAX_FILES)
    setSelectedFiles(combined)
    onFilesChange(combined)

    // Update previews
    previews.forEach((u) => URL.revokeObjectURL(u))
    const newPreviews = combined.map((f) => URL.createObjectURL(f))
    setPreviews(newPreviews)
  }, [selectedFiles, previews, onFilesChange])

  const removeFile = useCallback((index: number) => {
    const next = selectedFiles.filter((_, i) => i !== index)
    setSelectedFiles(next)
    onFilesChange(next)
    URL.revokeObjectURL(previews[index])
    setPreviews((prev) => prev.filter((_, i) => i !== index))
  }, [selectedFiles, previews, onFilesChange])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(Array.from(e.target.files))
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const handleDragOver = (e: DragEvent) => { e.preventDefault(); setIsDragging(true) }
  const handleDragLeave = (e: DragEvent) => { e.preventDefault(); setIsDragging(false) }
  const handleDrop = (e: DragEvent) => {
    e.preventDefault(); setIsDragging(false)
    if (e.dataTransfer.files) addFiles(Array.from(e.dataTransfer.files))
  }

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
    if (files.length > 0) addFiles(files)
  }, [addFiles])

  const containerRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    el.addEventListener("paste", handlePaste)
    return () => el.removeEventListener("paste", handlePaste)
  }, [handlePaste])

  const allPreviews = [...(existingUrls || []), ...previews]
  const canAdd = (selectedFiles.length + (existingUrls?.length || 0)) < MAX_FILES

  return (
    <div ref={containerRef} className={cn("space-y-3", className)}>
      <div
        className={cn(
          "relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
          isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-muted-foreground/50"
        )}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
      >
        <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />

        {allPreviews.length > 0 ? (
          <div className="flex gap-2 flex-wrap">
            {allPreviews.map((src, i) => (
              <PreviewItem key={i} src={src} onRemove={() => {
                if (i < (existingUrls?.length || 0)) {
                  // Existing URLs are managed by parent
                  return
                }
                removeFile(i - (existingUrls?.length || 0))
              }} />
            ))}
            {canAdd && (
              <div className="h-20 w-20 shrink-0 rounded-md border-2 border-dashed flex items-center justify-center text-muted-foreground hover:border-primary transition-colors">
                <Upload className="h-5 w-5" />
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex justify-center gap-4 text-muted-foreground">
              <div className="flex flex-col items-center gap-1"><Upload className="h-8 w-8" /><span className="text-xs">{t.upload.click}</span></div>
              <div className="flex flex-col items-center gap-1"><ImageIcon className="h-8 w-8" /><span className="text-xs">{t.upload.drag}</span></div>
              <div className="flex flex-col items-center gap-1"><ClipboardPaste className="h-8 w-8" /><span className="text-xs">{t.upload.paste}</span></div>
            </div>
            <p className="text-xs text-muted-foreground">最多 {MAX_FILES} 张，{t.upload.formats}</p>
          </div>
        )}
      </div>
    </div>
  )
}
