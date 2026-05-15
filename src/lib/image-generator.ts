// Generate a PNG image from title text using Canvas
// Used when no images are uploaded for a card

export function generateTitleImage(title: string): Blob | null {
  if (typeof document === "undefined") return null

  const text = title.trim().slice(0, 4) || "未命名"
  const size = 400
  const canvas = document.createElement("canvas")
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext("2d")
  if (!ctx) return null

  // Gradient background
  const gradient = ctx.createLinearGradient(0, 0, size, size)
  gradient.addColorStop(0, "#6366f1")
  gradient.addColorStop(1, "#8b5cf6")
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)

  // Decorative circles
  ctx.fillStyle = "rgba(255,255,255,0.08)"
  ctx.beginPath(); ctx.arc(60, 80, 100, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.arc(340, 300, 140, 0, Math.PI * 2); ctx.fill()

  // Text
  ctx.fillStyle = "#ffffff"
  const fontSize = text.length <= 2 ? 100 : text.length === 3 ? 80 : 64
  ctx.font = `bold ${fontSize}px "Microsoft YaHei", "PingFang SC", sans-serif`
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillText(text, size / 2, size / 2)

  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png")
  }) as unknown as Blob
}

export async function generateTitleImageAsync(title: string): Promise<Blob | null> {
  const text = title.trim().slice(0, 4) || "未命名"
  const size = 400
  const canvas = document.createElement("canvas")
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext("2d")
  if (!ctx) return null

  const gradient = ctx.createLinearGradient(0, 0, size, size)
  gradient.addColorStop(0, "#6366f1")
  gradient.addColorStop(1, "#8b5cf6")
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)

  ctx.fillStyle = "rgba(255,255,255,0.08)"
  ctx.beginPath(); ctx.arc(60, 80, 100, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.arc(340, 300, 140, 0, Math.PI * 2); ctx.fill()

  ctx.fillStyle = "#ffffff"
  const fontSize = text.length <= 2 ? 100 : text.length === 3 ? 80 : 64
  ctx.font = `bold ${fontSize}px "Microsoft YaHei", "PingFang SC", sans-serif`
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillText(text, size / 2, size / 2)

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png")
  })
}
