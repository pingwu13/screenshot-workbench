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
  getAll(): Card[] {
    return readCards()
  },

  getById(id: string): Card | undefined {
    return readCards().find((c) => c.id === id)
  },

  create(input: CreateCardInput): Card {
    const cards = readCards()
    const now = new Date().toISOString()
    const card: Card = {
      id: generateId(),
      ...input,
      createdAt: now,
      updatedAt: now,
    }
    cards.push(card)
    writeCards(cards)
    return card
  },

  update(id: string, input: UpdateCardInput): Card | undefined {
    const cards = readCards()
    const idx = cards.findIndex((c) => c.id === id)
    if (idx === -1) return undefined
    cards[idx] = {
      ...cards[idx],
      ...input,
      id: cards[idx].id,
      createdAt: cards[idx].createdAt,
      updatedAt: new Date().toISOString(),
    }
    writeCards(cards)
    return cards[idx]
  },

  delete(id: string): boolean {
    const cards = readCards()
    const filtered = cards.filter((c) => c.id !== id)
    if (filtered.length === cards.length) return false
    writeCards(filtered)
    return true
  },

  search(query: string): Card[] {
    const q = query.toLowerCase()
    return readCards().filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.summary.toLowerCase().includes(q) ||
        c.tags.some((t) => t.toLowerCase().includes(q)) ||
        c.ocrText.toLowerCase().includes(q)
    )
  },

  filterByStatus(status: Card["status"]): Card[] {
    return readCards().filter((c) => c.status === status)
  },

  filterByType(type: Card["type"]): Card[] {
    return readCards().filter((c) => c.type === type)
  },
}
