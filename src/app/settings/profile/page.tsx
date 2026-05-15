"use client"

import { useCallback, useEffect, useState } from "react"
import { ProtectedPage } from "@/components/layout/protected-page"
import { useAuth } from "@/components/auth/auth-provider"
import { getBrowserClient } from "@/lib/supabase-browser"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { Loader2, Settings, User, Mail, KeyRound } from "lucide-react"

export default function ProfileSettingsPage() {
  const { user, refreshUser } = useAuth()

  const [displayName, setDisplayName] = useState("")
  const [avatarUrl, setAvatarUrl] = useState("")
  const [savingProfile, setSavingProfile] = useState(false)

  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [savingPassword, setSavingPassword] = useState(false)

  const supabase = getBrowserClient()

  // Load profile
  useEffect(() => {
    if (!user) return
    const metaName = user.user_metadata?.display_name as string | undefined
    const metaAvatar = user.user_metadata?.avatar_url as string | undefined
    setDisplayName(metaName || "")
    setAvatarUrl(metaAvatar || "")

    // Also try loading from profiles table
    supabase
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("id", user.id)
      .single()
      .then(({ data, error }) => {
        if (!error && data) {
          if (!metaName && data.display_name) setDisplayName(data.display_name)
          if (!metaAvatar && data.avatar_url) setAvatarUrl(data.avatar_url)
        }
      })
  }, [user, supabase])

  // Save profile
  const handleSaveProfile = useCallback(async () => {
    if (!user) return
    setSavingProfile(true)
    try {
      // Update profiles table
      const { error: profileErr } = await supabase
        .from("profiles")
        .upsert(
          {
            id: user.id,
            email: user.email,
            display_name: displayName,
            avatar_url: avatarUrl,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" }
        )

      if (profileErr) {
        toast.error("保存个人资料失败")
        console.error(profileErr)
        return
      }

      // Sync to auth metadata
      await supabase.auth.updateUser({
        data: { display_name: displayName, avatar_url: avatarUrl },
      })

      await refreshUser()
      toast.success("个人资料已保存")
    } catch (err) {
      toast.error("保存失败")
      console.error(err)
    } finally {
      setSavingProfile(false)
    }
  }, [user, displayName, avatarUrl, supabase, refreshUser])

  // Change password
  const handleChangePassword = useCallback(async () => {
    if (!user) return
    if (newPassword.length < 6) {
      toast.error("新密码至少 6 位")
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error("两次输入的密码不一致")
      return
    }
    setSavingPassword(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) {
        toast.error(error.message)
        return
      }
      toast.success("密码已修改，请妥善保存新密码")
      setNewPassword("")
      setConfirmPassword("")
    } catch (err) {
      toast.error("修改密码失败")
      console.error(err)
    } finally {
      setSavingPassword(false)
    }
  }, [user, newPassword, confirmPassword, supabase])

  return (
    <ProtectedPage>
      <div className="max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Settings className="h-6 w-6" />
            个人设置
          </h1>
          <p className="text-muted-foreground mt-1">管理你的账户资料和安全设置</p>
        </div>

        {/* Account Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Mail className="h-4 w-4" />
              账户信息
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">邮箱</Label>
              <Input value={user?.email || ""} disabled className="opacity-70" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">用户 ID</Label>
              <p className="text-xs font-mono text-muted-foreground bg-muted p-2 rounded">
                {user?.id || "—"}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4" />
              个人资料
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="displayName">昵称</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="你的昵称"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="avatarUrl">头像 URL</Label>
              <Input
                id="avatarUrl"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://example.com/avatar.jpg"
              />
              {avatarUrl && (
                <div className="flex items-center gap-2 pt-1">
                  <img
                    src={avatarUrl}
                    alt="Avatar preview"
                    className="h-10 w-10 rounded-full object-cover border"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }}
                  />
                  <span className="text-xs text-muted-foreground">头像预览</span>
                </div>
              )}
            </div>
            <Button onClick={handleSaveProfile} disabled={savingProfile}>
              {savingProfile ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              保存个人资料
            </Button>
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <KeyRound className="h-4 w-4" />
              修改密码
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="newPassword">新密码</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="至少 6 位"
                minLength={6}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">确认新密码</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="再次输入新密码"
              />
            </div>
            <Button onClick={handleChangePassword} disabled={savingPassword} variant="outline">
              {savingPassword ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              更新密码
            </Button>
          </CardContent>
        </Card>
      </div>
    </ProtectedPage>
  )
}
