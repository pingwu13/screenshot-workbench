// AI Service Interface
// Current: mock implementation
// Future: replace with DeepSeek API calls

import { CardType } from "@/types/card"

export interface AiCardSuggestion {
  title: string
  summary: string
  type: CardType
  tags: string[]
  nextAction: string
}

export interface AiService {
  summarize(ocrText: string): Promise<AiCardSuggestion>
}

// Mock implementation - returns simulated AI suggestions
const mockAiService: AiService = {
  async summarize(ocrText: string): Promise<AiCardSuggestion> {
    await new Promise((r) => setTimeout(r, 800))

    // Generate mock suggestions based on keywords in the OCR text
    const text = ocrText.toLowerCase()

    let type: CardType = "reference"
    if (text.includes("学") || text.includes("教程") || text.includes("课程"))
      type = "learn"
    else if (text.includes("做") || text.includes("任务") || text.includes("项目"))
      type = "todo"
    else if (text.includes("灵感") || text.includes("想法") || text.includes("创意"))
      type = "idea"

    return {
      title: `[AI 建议] 来自截图的${type === "learn" ? "学习内容" : type === "todo" ? "待办事项" : type === "idea" ? "灵感记录" : "参考资料"}`,
      summary: "这是 AI 根据截图 OCR 文字自动生成的摘要。升级到真实 DeepSeek API 后将提供更准确的分析结果。",
      type,
      tags: ["截图", "待整理"],
      nextAction: "在 Board 中规划具体行动",
    }
  },
}

// DeepSeek real implementation placeholder
// const deepseekService: AiService = {
//   async summarize(ocrText: string): Promise<AiCardSuggestion> {
//     const response = await fetch(`${DEEPSEEK_ENDPOINT}/chat/completions`, {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//         Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
//       },
//       body: JSON.stringify({
//         model: "deepseek-chat",
//         messages: [
//           {
//             role: "system",
//             content: "你是一个截图整理助手。根据 OCR 文字生成标题、摘要、标签、分类和下一步行动。返回 JSON 格式。",
//           },
//           { role: "user", content: ocrText },
//         ],
//         response_format: { type: "json_object" },
//       }),
//     })
//     const data = await response.json()
//     return JSON.parse(data.choices[0].message.content)
//   },
// }

export function getAiService(): AiService {
  // TODO: switch based on env config
  return mockAiService
}
