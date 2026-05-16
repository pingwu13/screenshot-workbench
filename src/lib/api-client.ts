import { getBrowserClient } from "@/lib/supabase-browser"

export async function authFetch(url: string, init?: RequestInit): Promise<Response> {
  let token: string | null = null
  try {
    const { data } = await getBrowserClient().auth.getSession()
    token = data.session?.access_token || null
  } catch (err) {
    console.error("[authFetch] getSession failed:", err)
    // Proceed without token — API will return 401 which is handled by callers
  }

  const headers = new Headers(init?.headers)
  if (token) {
    headers.set("Authorization", `Bearer ${token}`)
  }

  return fetch(url, { ...init, headers })
}
