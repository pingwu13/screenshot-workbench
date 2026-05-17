import { NextRequest, NextResponse } from "next/server"
import { getCurrentUserId, getToken, createAuthClient } from "@/lib/auth"

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; planId: string }> }) {
  const userId = await getCurrentUserId(req)
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { planId } = await params
  const token = getToken(req)!
  const supabase = createAuthClient(token)

  const { error } = await supabase
    .from("card_ai_plans")
    .delete()
    .eq("id", planId)
    .eq("user_id", userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
