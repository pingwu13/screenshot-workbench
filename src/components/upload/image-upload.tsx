"use client"

import { useCallback, useState, useRef, useEffect, DragEvent } from "react"
import { Upload, Image as ImageIcon, ClipboardPaste } from "lucide-react"
import { cn } from "@/lib/utils"
import { useI18n } from "@/i18n/context"

interface ImageUploadProps {
  onUpload: (imageUrl: string) => void
  previewUrl?: string
  className?: string
}

export function ImageUpload({
  onUpload,
  previewUrl,
  className,
}: ImageUploadProps) {
  const { t } = useI18n()
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState(previewUrl || "")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const uploadFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) return

      setUploading(true)
      try {
        const formData = new FormData()
        formData.append("file", file)
        const res = await fetch("/api/upload", { method: "POST", body: formData })
        const data = await res.json()
        if (data.imageUrl) {
          setPreview(data.imageUrl)
          onUpload(data.imageUrl)
        }
      } catch (err) {
        console.error("Upload failed:", err)
      } finally {
        setUploading(false)
      }
    },
    [onUpload]
  )

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) uploadFile(file)
  }

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) uploadFile(file)
  }

  const handlePaste = useCallback(
    (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile()
          if (file) uploadFile(file)
        }
      }
    },
    [uploadFile]
  )

  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    el.addEventListener("paste", handlePaste)
    return () => el.removeEventListener("paste", handlePaste)
  }, [handlePaste])

  return (
    <div ref={containerRef} className={cn("space-y-3", className)}>
      <div
        className={cn(
          "relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-muted-foreground/50",
          uploading && "opacity-50 pointer-events-none"
        )}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />

        {preview ? (
          <div className="relative">
            <img
              src={preview}
              alt="Preview"
              className="max-h-64 mx-auto rounded-md object-contain"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center rounded-md">
              <span className="text-white text-sm">{t.upload.reupload}</span>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex justify-center gap-4 text-muted-foreground">
              <div className="flex flex-col items-center gap-1">
                <Upload className="h-8 w-8" />
                <span className="text-xs">{t.upload.click}</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <ImageIcon className="h-8 w-8" />
                <span className="text-xs">{t.upload.drag}</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <ClipboardPaste className="h-8 w-8" />
                <span className="text-xs">{t.upload.paste}</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {t.upload.formats}
            </p>
          </div>
        )}

        {uploading && (
          <div className="absolute inset-0 bg-background/60 flex items-center justify-center rounded-lg">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              {t.upload.uploading}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
