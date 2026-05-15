"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { ProtectedPage } from "@/components/layout/protected-page"
import { useAuth } from "@/components/auth/auth-provider"
import { getBrowserClient } from "@/lib/supabase-browser"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { ExpressionPicker } from "@/components/settings/signature-expression-picker"
import { Loader2, Settings, User, Mail, KeyRound, Camera, Trash2, UserRound, PenLine } from "lucide-react"

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"]
const MAX_SIZE = 2 * 1024 * 1024
const SIGNED_URL_EXPIRY = 60 * 60 * 24 * 365
const SIG_MAX = 40

const FONT_OPTIONS = [
  { value: "sans", label: "无衬线" },
  { value: "serif", label: "衬线" },
  { value: "mono", label: "等宽" },
  { value: "kai", label: "楷体" },
]

export default function ProfileSettingsPage() {
  const { user, refreshUser } = useAuth()
  const supabase = getBrowserClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const signatureInputRef = useRef<HTMLInputElement>(null)

  const [displayName, setDisplayName] = useState("")
  const [avatarUrl, setAvatarUrl] = useState("")
  const [avatarPath, setAvatarPath] = useState("")
  const [savingProfile, setSavingProfile] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  const [signatureText, setSignatureText] = useState("")
  const [signatureFont, setSignatureFont] = useState("sans")
  const [signatureBold, setSignatureBold] = useState(false)
  const [signatureItalic, setSignatureItalic] = useState(false)
  const [savingSignature, setSavingSignature] = useState(false)

  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [savingPassword, setSavingPassword] = useState(false)

  // Load profile
  useEffect(() => {
    if (!user) return
    const metaName = user.user_metadata?.display_name as string | undefined
    const metaAvatar = user.user_metadata?.avatar_url as string | undefined
    setDisplayName(metaName || "")
    setAvatarUrl(metaAvatar || "")

    supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single()
      .then(({ data, error }) => {
        if (!error && data) {
          if (!metaName && data.display_name) setDisplayName(data.display_name)
          if (!metaAvatar && data.avatar_url) setAvatarUrl(data.avatar_url)
          if (data.avatar_path) setAvatarPath(data.avatar_path)
          if (data.signature_text) setSignatureText(data.signature_text)
          if (data.signature_font) setSignatureFont(data.signature_font)
          setSignatureBold(!!data.signature_bold)
          setSignatureItalic(!!data.signature_italic)
        }
      })
  }, [user, supabase])

  // Avatar upload
  const handleAvatarUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    if (!ALLOWED_TYPES.includes(file.type)) { toast.error("仅支持 JPG、PNG、WebP 格式"); return }
    if (file.size > MAX_SIZE) { toast.error("图片大小不能超过 2MB"); return }
    setUploadingAvatar(true)
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "png"
      const fileName = `avatar-${Date.now()}.${ext}`
      const filePath = `${user.id}/${fileName}`
      const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, file, { contentType: file.type, upsert: true })
      if (uploadError) throw uploadError
      const { data: signed } = await supabase.storage.from("avatars").createSignedUrl(filePath, SIGNED_URL_EXPIRY)
      if (!signed?.signedUrl) throw new Error("Failed to generate signed URL")
      if (avatarPath && avatarPath !== filePath) {
        supabase.storage.from("avatars").remove([avatarPath]).catch(() => {})
      }
      await supabase.from("profiles").upsert({ id: user.id, email: user.email, avatar_url: signed.signedUrl, avatar_path: filePath, updated_at: new Date().toISOString() }, { onConflict: "id" })
      await supabase.auth.updateUser({ data: { avatar_url: signed.signedUrl } })
      setAvatarUrl(signed.signedUrl)
      setAvatarPath(filePath)
      await refreshUser()
      window.dispatchEvent(new Event("profile-updated"))
      toast.success("头像已更新")
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      toast.error(msg || "上传失败")
    } finally {
      setUploadingAvatar(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }, [user, avatarPath, supabase, refreshUser])

  // Delete avatar
  const handleDeleteAvatar = useCallback(async () => {
    if (!user || !avatarPath) return
    try { await supabase.storage.from("avatars").remove([avatarPath]).catch(() => {}) } catch {}
    await supabase.from("profiles").update({ avatar_url: "", avatar_path: "", updated_at: new Date().toISOString() }).eq("id", user.id)
    await supabase.auth.updateUser({ data: { avatar_url: "" } })
    setAvatarUrl("")
    setAvatarPath("")
    await refreshUser()
    window.dispatchEvent(new Event("profile-updated"))
    toast.success("头像已删除")
  }, [user, avatarPath, supabase, refreshUser])

  // Save profile
  const handleSaveProfile = useCallback(async () => {
    if (!user) return
    setSavingProfile(true)
    try {
      await supabase.from("profiles").upsert({
        id: user.id, email: user.email, display_name: displayName, updated_at: new Date().toISOString(),
      }, { onConflict: "id" })
      await supabase.auth.updateUser({ data: { display_name: displayName } })
      await refreshUser()
      window.dispatchEvent(new Event("profile-updated"))
      toast.success("个人资料已保存")
    } catch { toast.error("保存失败") }
    finally { setSavingProfile(false) }
  }, [user, displayName, supabase, refreshUser])

  // Save signature
  // Insert expression at cursor position
  const insertExpression = useCallback((value: string) => {
    const input = signatureInputRef.current
    const start = input?.selectionStart ?? signatureText.length
    const end = input?.selectionEnd ?? signatureText.length

    const next = signatureText.slice(0, start) + value + signatureText.slice(end)
    const normalized = next.replace(/\s+/g, " ")

    if (normalized.length > SIG_MAX) {
      toast.error(`签名不能超过 ${SIG_MAX} 个字符`)
      return
    }

    setSignatureText(next)

    requestAnimationFrame(() => {
      input?.focus()
      const pos = start + value.length
      input?.setSelectionRange(pos, pos)
    })
  }, [signatureText])

  const handleSaveSignature = useCallback(async () => {
    if (!user) return
    const normalized = signatureText.replace(/\s+/g, " ").trim()
    if (normalized.length > SIG_MAX) { toast.error(`签名不能超过 ${SIG_MAX} 个字符`); return }
    setSavingSignature(true)
    try {
      await supabase.from("profiles").upsert({
        id: user.id, email: user.email,
        signature_text: normalized,
        signature_font: signatureFont,
        signature_bold: signatureBold,
        signature_italic: signatureItalic,
        updated_at: new Date().toISOString(),
      }, { onConflict: "id" })
      window.dispatchEvent(new Event("profile-updated"))
      toast.success("签名已保存")
    } catch { toast.error("保存签名失败") }
    finally { setSavingSignature(false) }
  }, [user, signatureText, signatureFont, signatureBold, signatureItalic, supabase])

  // Change password
  const handleChangePassword = useCallback(async () => {
    if (!user) return
    if (newPassword.length < 6) { toast.error("新密码至少 6 位"); return }
    if (newPassword !== confirmPassword) { toast.error("两次输入的密码不一致"); return }
    setSavingPassword(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) { toast.error(error.message); return }
      toast.success("密码已修改")
      setNewPassword(""); setConfirmPassword("")
    } catch { toast.error("修改密码失败") }
    finally { setSavingPassword(false) }
  }, [user, newPassword, confirmPassword, supabase])

  // Signature preview class
  const isKai = signatureFont === "kai"
  const signatureClass = cn(
    "truncate text-sm text-muted-foreground max-w-full",
    signatureBold && "font-bold",
    signatureItalic && "italic",
    signatureFont === "serif" && "font-serif",
    signatureFont === "mono" && "font-mono",
    signatureFont === "sans" && "font-sans"
  )

  return (
    <ProtectedPage>
      <div className="max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><Settings className="h-6 w-6" />个人设置</h1>
          <p className="text-muted-foreground mt-1">管理你的账户资料和安全设置</p>
        </div>

        {/* Account Info */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Mail className="h-4 w-4" />账户信息</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">邮箱</Label><Input value={user?.email || ""} disabled className="opacity-70" /></div>
            <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">用户 ID</Label><p className="text-xs font-mono text-muted-foreground bg-muted p-2 rounded">{user?.id || "—"}</p></div>
          </CardContent>
        </Card>

        {/* Profile */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><User className="h-4 w-4" />个人资料</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              {avatarUrl ? (
                <img src={avatarUrl} alt="头像" className="h-16 w-16 rounded-full object-cover border" onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }} />
              ) : (
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center border"><UserRound className="h-8 w-8 text-muted-foreground" /></div>
              )}
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="gap-1" onClick={() => fileInputRef.current?.click()} disabled={uploadingAvatar}>
                    {uploadingAvatar ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
                    {uploadingAvatar ? "上传中..." : "上传头像"}
                  </Button>
                  {avatarPath && <Button variant="outline" size="sm" className="gap-1 text-destructive" onClick={handleDeleteAvatar}><Trash2 className="h-3.5 w-3.5" />删除</Button>}
                </div>
                <p className="text-xs text-muted-foreground">JPG、PNG、WebP，最大 2MB</p>
              </div>
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleAvatarUpload} />
            </div>
            <div className="space-y-1.5"><Label htmlFor="displayName">昵称</Label><Input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="你的昵称" /></div>
            <Button onClick={handleSaveProfile} disabled={savingProfile}>{savingProfile ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}保存个人资料</Button>
          </CardContent>
        </Card>

        {/* Signature */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><PenLine className="h-4 w-4" />个性签名</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between"><Label htmlFor="signature">签名内容</Label><span className="text-xs text-muted-foreground">{signatureText.length} / {SIG_MAX}</span></div>
              <Input id="signature" ref={signatureInputRef} value={signatureText} onChange={(e) => setSignatureText(e.target.value)} placeholder="写一句想显示在顶部的话" maxLength={SIG_MAX} />
            </div>
            <div className="space-y-1.5">
              <Label>字体</Label>
              <div className="flex gap-2">
                {FONT_OPTIONS.map((f) => (
                  <Button key={f.value} variant={signatureFont === f.value ? "default" : "outline"} size="sm" onClick={() => setSignatureFont(f.value)}>{f.label}</Button>
                ))}
                <ExpressionPicker onSelect={insertExpression} />
              </div>
            </div>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={signatureBold} onChange={(e) => setSignatureBold(e.target.checked)} className="rounded" />
                加粗
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={signatureItalic} onChange={(e) => setSignatureItalic(e.target.checked)} className="rounded" />
                斜体
              </label>
            </div>
            {/* Preview */}
            {signatureText.trim() && (
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground mb-1">预览</p>
                <span className={signatureClass} style={isKai ? { fontFamily: `"KaiTi", "STKaiti", "Yu Mincho", serif` } : undefined}>
                  {signatureText}
                </span>
              </div>
            )}
            <Button onClick={handleSaveSignature} disabled={savingSignature}>{savingSignature ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}保存签名</Button>
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><KeyRound className="h-4 w-4" />修改密码</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5"><Label htmlFor="newPassword">新密码</Label><Input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="至少 6 位" minLength={6} /></div>
            <div className="space-y-1.5"><Label htmlFor="confirmPassword">确认新密码</Label><Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="再次输入新密码" /></div>
            <Button onClick={handleChangePassword} disabled={savingPassword} variant="outline">{savingPassword ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}更新密码</Button>
          </CardContent>
        </Card>
      </div>
    </ProtectedPage>
  )
}
