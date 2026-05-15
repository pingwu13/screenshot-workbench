export type CardType = "learn" | "todo" | "reference" | "idea"

export type CardStatus = "inbox" | "planned" | "doing" | "done" | "archived"

export interface Card {
  id: string
  title: string
  summary: string
  type: CardType
  status: CardStatus
  tags: string[]
  note: string
  imageUrl: string
  ocrText: string
  nextAction: string
  createdAt: string
  updatedAt: string
}

export type CreateCardInput = Omit<Card, "id" | "createdAt" | "updatedAt">
export type UpdateCardInput = Partial<CreateCardInput>

export const CARD_TYPE_LABELS: Record<CardType, string> = {
  learn: "想学",
  todo: "想做",
  reference: "资料",
  idea: "灵感",
}

export const CARD_STATUS_LABELS: Record<CardStatus, string> = {
  inbox: "收集箱",
  planned: "计划中",
  doing: "进行中",
  done: "已完成",
  archived: "已归档",
}

export const CARD_STATUS_ORDER: CardStatus[] = [
  "inbox",
  "planned",
  "doing",
  "done",
  "archived",
]
