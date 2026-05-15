"use client"

import { useState, useRef, useEffect, DragEvent, useCallback } from "react"
import { Upload, Image as ImageIcon, ClipboardPaste, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { useI18n } from "@/i18n/context"

interface ImageUploadProps {
  onFileChange: (file: File | null) => void
  existingUrl?: string
  className?: string
}

export function ImageUpload({
  onFileChange,
  existingUrl,
  className,
}: ImageUploadProps) {
  const { t } = useI18n()
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [objectUrl, setObjectUrl] = useState<string>("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Cleanup object URL on unmount
  useEffect(() => {
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) return

      // Revoke previous object URL
      if (objectUrl) URL.revokeObjectURL(objectUrl)

      const url = URL.createObjectURL(file)
      setObjectUrl(url)
      setSelectedFile(file)
      onFileChange(file)
    },
    [objectUrl, onFileChange]
  )

  const handleClear = useCallback(() => {
    if (objectUrl) URL.revokeObjectURL(objectUrl)
    setObjectUrl("")
    setSelectedFile(null)
    onFileChange(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }, [objectUrl, onFileChange])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
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
    if (file) handleFile(file)
  }

  const handlePaste = useCallback(
    (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile()
          if (file) handleFile(file)
        }
      }
    },
    [handleFile]
  )

  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    el.addEventListener("paste", handlePaste)
    return () => el.removeEventListener("paste", handlePaste)
  }, [handlePaste])

  // Preview source: local object URL first, then existing remote URL
  const previewSrc = objectUrl || existingUrl || ""

  return (
    <div ref={containerRef} className={cn("space-y-3", className)}>
      <div
        className={cn(
          "relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-muted-foreground/50"
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

        {previewSrc ? (
          <div className="relative">
            <img
              src={previewSrc}
              alt="Preview"
              className="max-h-64 mx-auto rounded-md object-contain"
            />
            <button
              type="button"
              className="absolute top-1 right-1 h-6 w-6 rounded-full bg-foreground/60 text-background flex items-center justify-center hover:bg-foreground/80"
              onClick={(e) => {
                e.stopPropagation()
                handleClear()
              }}
            >
              <X className="h-3 w-3" />
            </button>
            <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center rounded-md pointer-events-none">
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
            <p className="text-xs text-muted-foreground">{t.upload.formats}</p>
          </div>
        )}
      </div>
    </div>
  )
}
