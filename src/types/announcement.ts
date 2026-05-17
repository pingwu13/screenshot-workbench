export type AnnouncementLevel = "normal" | "info" | "important"

export interface Announcement {
  id: string
  title: string
  summary: string
  content: string
  level: AnnouncementLevel
  created_at: string
}

export interface AnnouncementWithRead extends Announcement {
  read: boolean
}

export interface AnnouncementsResponse {
  announcements: AnnouncementWithRead[]
  unread_count: number
}
