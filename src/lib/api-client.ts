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

  let res: Response
  try {
    res = await fetch(url, { ...init, headers })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err || "Unknown fetch error")
    console.error(`[authFetch] ${url} network error:`, msg)
    throw new Error(`[authFetch] ${url} network error: ${msg}`)
  }

  if (!res.ok) {
    console.error(`[authFetch] ${url} failed: ${res.status} ${res.statusText}`)
  }
  return res
}
