"use client"

import { useState } from "react"
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
    ocrText: initialData?.ocrText || "",
    nextAction: initialData?.nextAction || "",
  })

  const [tagInput, setTagInput] = useState("")
  const [saving, setSaving] = useState(false)
  const [processing, setProcessing] = useState(false)

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

  const handleOcrAndAi = async () => {
    if (!form.imageUrl) {
      toast.error(t.card.uploadHint)
      return
    }

    setProcessing(true)
    try {
      const ocrRes = await fetch("/api/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: form.imageUrl }),
      })
      const ocrData = await ocrRes.json()
      updateField("ocrText", ocrData.text)
      toast.success(t.card.ocrDone)

      const aiRes = await fetch("/api/ai/summarize", {
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
    try {
      const url = isEdit ? `/api/cards/${initialData!.id}` : "/api/cards"
      const method = isEdit ? "PATCH" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
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

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Image Upload */}
      <div className="space-y-2">
        <Label>{t.card.uploadScreenshot}</Label>
        <ImageUpload
          previewUrl={form.imageUrl}
          onUpload={(url) => {
            updateField("imageUrl", url)
            if (!isEdit && !form.ocrText) {
              toast.info(t.card.uploadHint)
            }
          }}
        />
      </div>

      {/* OCR + AI Button */}
      {form.imageUrl && (
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
        <Button
          variant="outline"
          onClick={() => router.back()}
          type="button"
        >
          {t.card.cancel}
        </Button>
      </div>
    </div>
  )
}
