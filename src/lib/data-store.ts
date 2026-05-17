import { Card, CreateCardInput, UpdateCardInput } from "@/types/card"
import fs from "fs"
import path from "path"

const DATA_DIR = path.join(process.cwd(), ".data")
const DATA_FILE = path.join(DATA_DIR, "cards.json")

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, "[]", "utf-8")
  }
}

function readCards(): Card[] {
  ensureDataDir()
  const raw = fs.readFileSync(DATA_FILE, "utf-8")
  return JSON.parse(raw)
}

function writeCards(cards: Card[]) {
  ensureDataDir()
  fs.writeFileSync(DATA_FILE, JSON.stringify(cards, null, 2), "utf-8")
}

function generateId(): string {
  return `card_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export const cardStore = {
  getAll(userId: string): Card[] {
    return readCards().filter((c) => c.userId === userId)
  },

  getById(id: string, userId: string): Card | undefined {
    return readCards().find((c) => c.id === id && c.userId === userId)
  },

  create(input: CreateCardInput & { userId: string }): Card {
    const cards = readCards()
    const now = new Date().toISOString()
    const card: Card = {
      id: generateId(),
      userId: input.userId,
      title: input.title,
      summary: input.summary,
      type: input.type,
      status: input.status,
      tags: input.tags,
      category: input.category || "",
      note: input.note,
      imageUrl: input.imageUrl,
      imagePath: input.imagePath,
      images: input.images,
      generatedImageUrl: input.generatedImageUrl,
      ocrText: input.ocrText,
      nextAction: input.nextAction,
      aiSummary: input.aiSummary || "",
      aiPlan: input.aiPlan || "",
      createdAt: now,
      updatedAt: now,
    }
    cards.push(card)
    writeCards(cards)
    return card
  },

  update(id: string, userId: string, input: UpdateCardInput): Card | undefined {
    const cards = readCards()
    const idx = cards.findIndex((c) => c.id === id && c.userId === userId)
    if (idx === -1) return undefined
    cards[idx] = {
      ...cards[idx],
      ...input,
      id: cards[idx].id,
      userId: cards[idx].userId,
      createdAt: cards[idx].createdAt,
      updatedAt: new Date().toISOString(),
    }
    writeCards(cards)
    return cards[idx]
  },

  delete(id: string, userId: string): boolean {
    const cards = readCards()
    const filtered = cards.filter((c) => !(c.id === id && c.userId === userId))
    if (filtered.length === cards.length) return false
    writeCards(filtered)
    return true
  },

  search(query: string, userId: string): Card[] {
    const q = query.toLowerCase()
    return readCards().filter(
      (c) =>
        c.userId === userId &&
        (c.title.toLowerCase().includes(q) ||
          c.summary.toLowerCase().includes(q) ||
          c.tags.some((t) => t.toLowerCase().includes(q)) ||
          c.ocrText.toLowerCase().includes(q))
    )
  },
}
