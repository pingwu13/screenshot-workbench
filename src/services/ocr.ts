// OCR Service Interface
// Current: mock implementation
// Future: replace with PaddleOCR API calls

export interface OcrResult {
  text: string
  confidence: number
  blocks?: { text: string; bbox: number[] }[]
}

export interface OcrService {
  recognize(imageUrl: string): Promise<OcrResult>
}

// Mock implementation - returns simulated OCR text
const mockOcrService: OcrService = {
  async recognize(imageUrl: string): Promise<OcrResult> {
    // Simulate processing delay
    await new Promise((r) => setTimeout(r, 500))

    return {
      text: "[Mock OCR] 这是从截图中识别到的示例文字。包含一些关键词便于后续 AI 处理。",
      confidence: 0.92,
      blocks: [
        {
          text: "[Mock OCR] 这是从截图中识别到的示例文字。",
          bbox: [10, 10, 200, 50],
        },
        {
          text: "包含一些关键词便于后续 AI 处理。",
          bbox: [10, 60, 200, 100],
        },
      ],
    }
  },
}

// PaddleOCR real implementation placeholder
// const paddleOcrService: OcrService = {
//   async recognize(imageUrl: string): Promise<OcrResult> {
//     const response = await fetch(`${PADDLE_OCR_ENDPOINT}/ocr`, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ image_url: imageUrl }),
//     })
//     return response.json()
//   },
// }

export function getOcrService(): OcrService {
  // TODO: switch based on env config
  return mockOcrService
}
