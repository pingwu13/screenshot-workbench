export type ShortcutType = "website" | "software" | "tool" | "document" | "other"

export interface CreativeShortcut {
  id: string
  user_id: string
  title: string
  description: string
  type: ShortcutType
  url: string
  icon: string
  sort_order: number
  created_at: string
  updated_at: string
}

export interface CreativeShortcutInput {
  title: string
  description?: string
  type?: ShortcutType
  url?: string
  icon?: string
}
