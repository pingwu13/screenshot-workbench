"use client"

import { useRef, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth/auth-provider"
import { Card, CardType, CardStatus, CreateCardInput } from "@/types/card"
import { CARD_TYPE_LABELS, CARD_STATUS_LABELS } from "@/types/card"
import { CARD_LABELS } from "@/data/card-labels"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { ImageUpload } from "@/components/upload/image-upload"
import { authFetch } from "@/lib/api-client"
import { getBrowserClient } from "@/lib/supabase-browser"
import { useI18n } from "@/i18n/context"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

interface CardFormProps { initialData?: Card }

const supabaseBrowser = getBrowserClient()
const SIGNED_URL_TTL = 86400
const MAX_DIM = 1200
const JPEG_QUALITY = 0.8

async function compressImage(file: File): Promise<Blob> {
  if (file.type === "image/webp" || file.type === "image/gif") return file
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      let { width, height } = img
      if (width <= MAX_DIM && height <= MAX_DIM) { resolve(file); return }
      if (width > height) { height = Math.round(height * MAX_DIM / width); width = MAX_DIM }
      else { width = Math.round(width * MAX_DIM / height); height = MAX_DIM }
      const canvas = document.createElement("canvas")
      canvas.width = width; canvas.height = height
      const ctx = canvas.getContext("2d")!
      ctx.drawImage(img, 0, 0, width, height)
      canvas.toBlob((b) => b ? resolve(b) : resolve(file), "image/jpeg", JPEG_QUALITY)
    }
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file) }
    img.src = url
  })
}

async function uploadFile(file: File, userId: string): Promise<{ imageUrl: string; imagePath: string }> {
  const compressed = await compressImage(file)
  const filename = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`
  const storagePath = `${userId}/${filename}`

  const t0 = performance.now()
  const { data, error } = await supabaseBrowser.storage
    .from("screenshots")
    .upload(storagePath, compressed, { contentType: "image/jpeg", upsert: true })
  console.log(`[Upload] ${storagePath} upload: ${(performance.now() - t0).toFixed(0)}ms`)

  if (error) throw new Error(error.message)

  const t1 = performance.now()
  const { data: signed } = await supabaseBrowser.storage
    .from("screenshots")
    .createSignedUrl(data.path, SIGNED_URL_TTL)
  console.log(`[Upload] ${storagePath} sign: ${(performance.now() - t1).toFixed(0)}ms`)

  return { imageUrl: signed?.signedUrl || "", imagePath: storagePath }
}

async function deleteUploadedImages(paths: string[]) {
  if (paths.length === 0) return
  const { error } = await supabaseBrowser.storage.from("screenshots").remove(paths)
  if (error) console.error("[CardForm] cleanup failed:", error.message)
}

export function CardForm({ initialData }: CardFormProps) {
  const router = useRouter()
  const { t } = useI18n()
  const { user } = useAuth()
  const isEdit = !!initialData

  const [form, setForm] = useState<CreateCardInput>({
    title: initialData?.title || "",
    summary: initialData?.summary || "",
    type: initialData?.type || "reference",
    status: initialData?.status || "inbox",
    tags: initialData?.tags || [],
    label: initialData?.label || "",
    note: initialData?.note || "",
    imageUrl: initialData?.imageUrl || "",
    imagePath: initialData?.imagePath || "",
    images: initialData?.images || [],
    generatedImageUrl: initialData?.generatedImageUrl || "",
    ocrText: initialData?.ocrText || "",
    nextAction: initialData?.nextAction || "",
  })

  const [tagInput, setTagInput] = useState("")
  const [saving, setSaving] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [pendingFiles, setPendingFiles] = useState<File[]>([])

  const orphanPath = useRef<string | null>(null)

  useEffect(() => {
    return () => {
      if (orphanPath.current) deleteUploadedImages([orphanPath.current])
    }
  }, [])

  const updateField = <K extends keyof CreateCardInput>(key: K, value: CreateCardInput[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const addTag = () => {
    const tag = tagInput.trim()
    if (tag && !form.tags.includes(tag)) updateField("tags", [...form.tags, tag])
    setTagInput("")
  }
  const removeTag = (t: string) => updateField("tags", form.tags.filter((x) => x !== t))

  const handleOcrAndAi = async () => {
    let imgUrl = form.imageUrl || form.images[0] || form.generatedImageUrl
    if (!imgUrl && pendingFiles.length > 0) {
      try {
        const r = await uploadFile(pendingFiles[0], user!.id)
        imgUrl = r.imageUrl
        orphanPath.current = r.imagePath
        updateField("imageUrl", r.imageUrl)
        updateField("images", [r.imageUrl])
        setPendingFiles([])
      } catch { toast.error(t.card.processFailed); return }
    }
    if (!imgUrl) { toast.error("请先上传截图"); return }

    setProcessing(true)
    try {
      const ocrRes = await authFetch("/api/ocr", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ imageUrl: imgUrl }) })
      const ocrData = await ocrRes.json()
      updateField("ocrText", ocrData.text)
      toast.success(t.card.ocrDone)

      const aiRes = await authFetch("/api/ai/summarize", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ocrText: ocrData.text }) })
      const aiData = await aiRes.json()
      updateField("title", aiData.title)
      updateField("summary", aiData.summary)
      updateField("type", aiData.type)
      updateField("tags", aiData.tags)
      updateField("nextAction", aiData.nextAction)
      toast.success(t.card.aiDone)
    } catch { toast.error(t.card.processFailed) }
    finally { setProcessing(false) }
  }

  const handleSubmit = async () => {
    setSaving(true)
    let uploadedPaths: string[] = []

    try {
      // Upload pending files in parallel
      const uploadedUrls: string[] = []
      if (pendingFiles.length > 0 && user?.id) {
        try {
          const results = await Promise.all(
            pendingFiles.map((f) => uploadFile(f, user.id))
          )
          for (const r of results) {
            uploadedUrls.push(r.imageUrl)
            uploadedPaths.push(r.imagePath)
          }
        } catch (uploadErr: any) {
          console.error("[CardForm] upload failed:", uploadErr?.message || uploadErr)
          toast.error(`图片上传失败: ${uploadErr?.message || '未知错误'}`)
          setSaving(false)
          return
        }
      }

      const finalImages = uploadedUrls.length > 0 ? uploadedUrls : form.images
      const imagePath = uploadedPaths.length > 0 ? uploadedPaths[0] : form.imagePath

      const cardData = {
        ...form,
        images: finalImages,
        imagePath,
        imageUrl: finalImages[0] || "",
        generatedImageUrl: "",
      }

      const url = isEdit ? `/api/cards/${initialData!.id}` : "/api/cards"
      const method = isEdit ? "PATCH" : "POST"
      const res = await authFetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(cardData) })

      if (!res.ok) {
        // Rollback: delete just-uploaded images
        if (uploadedPaths.length > 0) await deleteUploadedImages(uploadedPaths)
        const errText = await res.text()
        console.error("[CardForm] save failed:", res.status, errText)
        toast.error(`${t.card.saveFailed} (${res.status})`)
        setSaving(true)
        await new Promise((r) => setTimeout(r, 50))
        setSaving(false)
        return
      }

      orphanPath.current = null
      const data = await res.json()
      toast.success(isEdit ? t.card.saved : t.card.created)
      router.push(`/cards/${data.id}`)
      router.refresh()
    } catch {
      if (uploadedPaths.length > 0) await deleteUploadedImages(uploadedPaths)
      toast.error(t.card.saveFailed)
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    if (orphanPath.current) deleteUploadedImages([orphanPath.current])
    router.back()
  }

  const hasImages = (form.images.length > 0 || form.generatedImageUrl || form.imageUrl || pendingFiles.length > 0)

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="space-y-2">
        <Label>{t.card.uploadScreenshot}</Label>
        <ImageUpload
          existingUrls={form.images.length > 0 ? form.images : form.imageUrl ? [form.imageUrl] : undefined}
          onFilesChange={(files) => setPendingFiles(files)}
        />
      </div>

      {hasImages && (
        <Button variant="outline" className="w-full gap-2" onClick={handleOcrAndAi} disabled={processing}>
          {processing ? <><Loader2 className="h-4 w-4 animate-spin" />{t.card.processing}</> : t.card.ocrAiButton}
        </Button>
      )}

      {form.ocrText && (
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">{t.card.ocrResult}</Label>
          <p className="text-sm bg-muted p-3 rounded-md max-h-24 overflow-y-auto">{form.ocrText}</p>
        </div>
      )}

      <div className="space-y-1"><Label>{t.card.title}</Label><Input value={form.title} onChange={(e) => updateField("title", e.target.value)} placeholder="" /></div>
      <div className="space-y-1"><Label>{t.card.summary}</Label><Textarea value={form.summary} onChange={(e) => updateField("summary", e.target.value)} placeholder="" rows={2} /></div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>标签</Label>
          <Select value={form.label || ""} onValueChange={(v) => updateField("label", v || "")}>
            <SelectTrigger><SelectValue placeholder="选择标签" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">无标签</SelectItem>
              {CARD_LABELS.map((l) => (<SelectItem key={l} value={l}>{l}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>{t.card.status}</Label>
          <Select value={form.status} onValueChange={(v) => updateField("status", v as CardStatus)}>
            <SelectTrigger><SelectValue>{t.status[form.status]}</SelectValue></SelectTrigger>
            <SelectContent>{(Object.entries(CARD_STATUS_LABELS) as [CardStatus, string][]).map(([v]) => (<SelectItem key={v} value={v}>{t.status[v]}</SelectItem>))}</SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1"><Label>{t.card.action}</Label><Input value={form.nextAction} onChange={(e) => updateField("nextAction", e.target.value)} placeholder="" /></div>
      <div className="space-y-1"><Label>{t.card.note}</Label><Textarea value={form.note} onChange={(e) => updateField("note", e.target.value)} placeholder="" rows={3} /></div>

      <div className="flex gap-3 pt-4">
        <Button onClick={handleSubmit} disabled={saving} className="flex-1">{saving ? t.card.saving : isEdit ? t.card.update : t.card.create}</Button>
        <Button variant="outline" onClick={handleCancel} type="button">{t.card.cancel}</Button>
      </div>
    </div>
  )
}
