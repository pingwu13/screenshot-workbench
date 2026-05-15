"use client"

import { useRef, useState, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardType, CardStatus, CreateCardInput } from "@/types/card"
import { CARD_TYPE_LABELS, CARD_STATUS_LABELS } from "@/types/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ImageUpload } from "@/components/upload/image-upload"
import { authFetch } from "@/lib/api-client"
import { useI18n } from "@/i18n/context"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

interface CardFormProps {
  initialData?: Card
}

export function CardForm({ initialData }: CardFormProps) {
  const router = useRouter()
  const { t } = useI18n()
  const isEdit = !!initialData

  const [form, setForm] = useState<CreateCardInput>({
    title: initialData?.title || "",
    summary: initialData?.summary || "",
    type: initialData?.type || "reference",
    status: initialData?.status || "inbox",
    tags: initialData?.tags || [],
    note: initialData?.note || "",
    imageUrl: initialData?.imageUrl || "",
    imagePath: initialData?.imagePath || "",
    ocrText: initialData?.ocrText || "",
    nextAction: initialData?.nextAction || "",
  })

  const [tagInput, setTagInput] = useState("")
  const [saving, setSaving] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [pendingFile, setPendingFile] = useState<File | null>(null)

  // Track an image uploaded via OCR+AI but not yet tied to a card
  const orphanStorageKey = useRef<string | null>(null)

  // Cleanup orphan image on unmount (user navigated away without submitting)
  useEffect(() => {
    return () => {
      const key = orphanStorageKey.current
      if (key) {
        authFetch(`/api/upload?key=${encodeURIComponent(key)}`, { method: "DELETE" })
          .catch(() => {})
      }
    }
  }, [])

  const updateField = <K extends keyof CreateCardInput>(
    key: K,
    value: CreateCardInput[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const addTag = () => {
    const tag = tagInput.trim()
    if (tag && !form.tags.includes(tag)) {
      updateField("tags", [...form.tags, tag])
    }
    setTagInput("")
  }

  const removeTag = (tag: string) => {
    updateField(
      "tags",
      form.tags.filter((t) => t !== tag)
    )
  }

  // Upload a file to storage, returns { imageUrl, storageKey }
  const uploadImage = useCallback(async (file: File) => {
    const formData = new FormData()
    formData.append("file", file)
    const res = await authFetch("/api/upload", { method: "POST", body: formData })
    if (!res.ok) throw new Error("Upload failed")
    return res.json() as Promise<{ imageUrl: string; storageKey: string }>
  }, [])

  const handleOcrAndAi = async () => {
    // Need an image URL first; if we only have a pending file, upload it now
    let imageUrl = form.imageUrl

    if (!imageUrl && pendingFile) {
      try {
        const result = await uploadImage(pendingFile)
        imageUrl = result.imageUrl
        orphanStorageKey.current = result.storageKey
        updateField("imageUrl", imageUrl)
        updateField("imagePath", result.storageKey)
        setPendingFile(null)
      } catch {
        toast.error(t.card.processFailed)
        return
      }
    }

    if (!imageUrl) {
      toast.error(t.card.uploadHint)
      return
    }

    setProcessing(true)
    try {
      const ocrRes = await authFetch("/api/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl }),
      })
      const ocrData = await ocrRes.json()
      updateField("ocrText", ocrData.text)
      toast.success(t.card.ocrDone)

      const aiRes = await authFetch("/api/ai/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ocrText: ocrData.text }),
      })
      const aiData = await aiRes.json()
      updateField("title", aiData.title)
      updateField("summary", aiData.summary)
      updateField("type", aiData.type)
      updateField("tags", aiData.tags)
      updateField("nextAction", aiData.nextAction)
      toast.success(t.card.aiDone)
    } catch (err) {
      toast.error(t.card.processFailed)
      console.error(err)
    } finally {
      setProcessing(false)
    }
  }

  const handleSubmit = async () => {
    setSaving(true)
    let newlyUploadedKey: string | null = null

    try {
      let finalImageUrl = form.imageUrl

      // Step 1: Upload image if there's a pending file
      if (pendingFile) {
        const result = await uploadImage(pendingFile)
        finalImageUrl = result.imageUrl
        newlyUploadedKey = result.storageKey
      }

      // Step 2: Create or update the card
      const url = isEdit ? `/api/cards/${initialData!.id}` : "/api/cards"
      const method = isEdit ? "PATCH" : "POST"
      const cardData = {
        ...form,
        imageUrl: finalImageUrl,
        imagePath: newlyUploadedKey || form.imagePath,
      }
      const res = await authFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cardData),
      })

      if (!res.ok) {
        // Step 3: Card creation failed — clean up the image we just uploaded
        if (newlyUploadedKey) {
          await authFetch(`/api/upload?key=${encodeURIComponent(newlyUploadedKey)}`, {
            method: "DELETE",
          }).catch(() => {})
        }
        throw new Error("Card creation failed")
      }

      // Success — clear orphan tracking (image is now owned by the card)
      orphanStorageKey.current = null
      setPendingFile(null)

      const data = await res.json()
      toast.success(isEdit ? t.card.saved : t.card.created)
      router.push(`/cards/${data.id}`)
      router.refresh()
    } catch (err) {
      toast.error(t.card.saveFailed)
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    // Clean up orphan image if user uploaded via OCR+AI but didn't submit
    const key = orphanStorageKey.current
    if (key) {
      fetch(`/api/upload?key=${encodeURIComponent(key)}`, { method: "DELETE" })
        .catch(() => {})
    }
    router.back()
  }

  const hasImage = form.imageUrl || pendingFile

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Image Upload */}
      <div className="space-y-2">
        <Label>{t.card.uploadScreenshot}</Label>
        <ImageUpload
          existingUrl={form.imageUrl || undefined}
          onFileChange={(file) => setPendingFile(file)}
        />
      </div>

      {/* OCR + AI Button */}
      {hasImage && (
        <Button
          variant="outline"
          className="w-full gap-2"
          onClick={handleOcrAndAi}
          disabled={processing}
        >
          {processing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {t.card.processing}
            </>
          ) : (
            t.card.ocrAiButton
          )}
        </Button>
      )}

      {/* OCR Text */}
      {form.ocrText && (
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">{t.card.ocrResult}</Label>
          <p className="text-sm bg-muted p-3 rounded-md max-h-24 overflow-y-auto">
            {form.ocrText}
          </p>
        </div>
      )}

      {/* Title */}
      <div className="space-y-1">
        <Label>{t.card.title}</Label>
        <Input
          value={form.title}
          onChange={(e) => updateField("title", e.target.value)}
          placeholder={t.card.title}
        />
      </div>

      {/* Summary */}
      <div className="space-y-1">
        <Label>{t.card.summary}</Label>
        <Textarea
          value={form.summary}
          onChange={(e) => updateField("summary", e.target.value)}
          placeholder={t.card.summary}
          rows={2}
        />
      </div>

      {/* Type & Status */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>{t.card.type}</Label>
          <Select
            value={form.type}
            onValueChange={(v) => updateField("type", v as CardType)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.entries(CARD_TYPE_LABELS) as [CardType, string][]).map(
                ([value]) => (
                  <SelectItem key={value} value={value}>
                    {t.type[value]}
                  </SelectItem>
                )
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label>{t.card.status}</Label>
          <Select
            value={form.status}
            onValueChange={(v) => updateField("status", v as CardStatus)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.entries(CARD_STATUS_LABELS) as [CardStatus, string][]).map(
                ([value]) => (
                  <SelectItem key={value} value={value}>
                    {t.status[value]}
                  </SelectItem>
                )
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tags */}
      <div className="space-y-1">
        <Label>{t.card.tags}</Label>
        <div className="flex gap-2">
          <Input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                addTag()
              }
            }}
            placeholder={t.card.tagPlaceholder}
          />
          <Button type="button" variant="outline" onClick={addTag}>
            {t.card.addTag}
          </Button>
        </div>
        {form.tags.length > 0 && (
          <div className="flex gap-1 flex-wrap mt-2">
            {form.tags.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="cursor-pointer"
                onClick={() => removeTag(tag)}
              >
                {tag} ×
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Next Action */}
      <div className="space-y-1">
        <Label>{t.card.action}</Label>
        <Input
          value={form.nextAction}
          onChange={(e) => updateField("nextAction", e.target.value)}
          placeholder={t.card.action}
        />
      </div>

      {/* Note */}
      <div className="space-y-1">
        <Label>{t.card.note}</Label>
        <Textarea
          value={form.note}
          onChange={(e) => updateField("note", e.target.value)}
          placeholder={t.card.note}
          rows={3}
        />
      </div>

      {/* Submit */}
      <div className="flex gap-3 pt-4">
        <Button onClick={handleSubmit} disabled={saving} className="flex-1">
          {saving ? t.card.saving : isEdit ? t.card.update : t.card.create}
        </Button>
        <Button variant="outline" onClick={handleCancel} type="button">
          {t.card.cancel}
        </Button>
      </div>
    </div>
  )
}
