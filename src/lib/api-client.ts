import { getBrowserClient } from "@/lib/supabase-browser"

export async function authFetch(url: string, init?: RequestInit): Promise<Response> {
  const { data } = await getBrowserClient().auth.getSession()
  const token = data.session?.access_token

  const headers = new Headers(init?.headers)
  if (token) {
    headers.set("Authorization", `Bearer ${token}`)
  }

  return fetch(url, { ...init, headers })
}
