export const dynamic = "force-dynamic"

// Auth pages: plain layout, no sidebar, no auth gating
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
