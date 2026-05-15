import { createClient } from "@/lib/supabase"
import { isSupabaseConfigured } from "@/lib/supabase"
import type { Card, CreateCardInput, UpdateCardInput } from "@/types/card"

export interface CardStore {
  getAll(): Promise<Card[]>
  getById(id: string): Promise<Card | null>
  create(input: CreateCardInput): Promise<Card>
  update(id: string, input: UpdateCardInput): Promise<Card | null>
  delete(id: string): Promise<boolean>
  search(query: string): Promise<Card[]>
}

function toCard(row: Record<string, unknown>): Card {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    title: row.title as string,
    summary: row.summary as string,
    type: row.type as Card["type"],
    status: row.status as Card["status"],
    tags: row.tags as string[],
    note: row.note as string,
    imageUrl: row.image_url as string,
    imagePath: row.image_path as string,
    ocrText: row.ocr_text as string,
    nextAction: row.next_action as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

function toDb(input: UpdateCardInput & { userId?: string }): Record<string, unknown> {
  const db: Record<string, unknown> = {}
  if (input.userId !== undefined) db.user_id = input.userId
  if (input.title !== undefined) db.title = input.title
  if (input.summary !== undefined) db.summary = input.summary
  if (input.type !== undefined) db.type = input.type
  if (input.status !== undefined) db.status = input.status
  if (input.tags !== undefined) db.tags = input.tags
  if (input.note !== undefined) db.note = input.note
  if (input.imageUrl !== undefined) db.image_url = input.imageUrl
  if (input.imagePath !== undefined) db.image_path = input.imagePath
  if (input.ocrText !== undefined) db.ocr_text = input.ocrText
  if (input.nextAction !== undefined) db.next_action = input.nextAction
  return db
}

function createSupabaseStore(userId: string): CardStore {
  const supabase = createClient()

  return {
    async getAll(): Promise<Card[]> {
      const { data, error } = await supabase
        .from("cards")
        .select("*")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
      if (error) throw error
      return (data ?? []).map(toCard)
    },

    async getById(id: string): Promise<Card | null> {
      const { data, error } = await supabase
        .from("cards")
        .select("*")
        .eq("id", id)
        .eq("user_id", userId)
        .single()
      if (error) return null
      return data ? toCard(data) : null
    },

    async create(input: CreateCardInput): Promise<Card> {
      const db = toDb({ ...input, userId })
      const { data, error } = await supabase
        .from("cards")
        .insert(db)
        .select()
        .single()
      if (error) throw error
      return toCard(data)
    },

    async update(id: string, input: UpdateCardInput): Promise<Card | null> {
      const db = toDb(input)
      const { data, error } = await supabase
        .from("cards")
        .update(db)
        .eq("id", id)
        .eq("user_id", userId)
        .select()
        .single()
      if (error) return null
      return data ? toCard(data) : null
    },

    async delete(id: string): Promise<boolean> {
      const { error } = await supabase
        .from("cards")
        .delete()
        .eq("id", id)
        .eq("user_id", userId)
      return !error
    },

    async search(query: string): Promise<Card[]> {
      const q = query.toLowerCase()
      const { data, error } = await supabase
        .from("cards")
        .select("*")
        .eq("user_id", userId)
        .or(`title.ilike.%${q}%,summary.ilike.%${q}%,ocr_text.ilike.%${q}%`)
        .order("updated_at", { ascending: false })
      if (error) throw error
      return (data ?? []).map(toCard)
    },
  }
}

function createLocalFallbackStore(userId: string): CardStore {
  const { cardStore } = require("@/lib/data-store")
  return {
    async getAll() { return cardStore.getAll(userId) },
    async getById(id: string) { return cardStore.getById(id, userId) ?? null },
    async create(input: CreateCardInput) { return cardStore.create({ ...input, userId }) },
    async update(id: string, input: UpdateCardInput) { return cardStore.update(id, userId, input) ?? null },
    async delete(id: string) { return cardStore.delete(id, userId) },
    async search(query: string) { return cardStore.search(query, userId) },
  }
}

let _storeCache: { userId: string; store: CardStore } | null = null

export function getCardStore(userId: string): CardStore {
  if (_storeCache && _storeCache.userId === userId) return _storeCache.store
  const store = isSupabaseConfigured()
    ? createSupabaseStore(userId)
    : createLocalFallbackStore(userId)
  _storeCache = { userId, store }
  return store
}
