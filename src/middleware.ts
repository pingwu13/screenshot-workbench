import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Auth protection is handled client-side by ProtectedPage.
// Middleware only runs on the server and cannot read browser localStorage.
export function middleware(req: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|uploads).*)"],
}
