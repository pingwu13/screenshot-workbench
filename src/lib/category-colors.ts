export const CATEGORY_COLORS = [
  "gray", "red", "orange", "yellow", "green", "cyan", "blue", "purple", "pink", "brown",
] as const

export type CategoryColor = (typeof CATEGORY_COLORS)[number]

export const CATEGORY_COLOR_OPTIONS: { value: CategoryColor; label: string }[] = [
  { value: "gray", label: "灰色" },
  { value: "red", label: "红色" },
  { value: "orange", label: "橙色" },
  { value: "yellow", label: "黄色" },
  { value: "green", label: "绿色" },
  { value: "cyan", label: "青色" },
  { value: "blue", label: "蓝色" },
  { value: "purple", label: "紫色" },
  { value: "pink", label: "粉色" },
  { value: "brown", label: "棕色" },
]

const BADGE_CLASSES: Record<string, string> = {
  gray:   "bg-gray-100 text-gray-700 border-gray-200",
  red:    "bg-red-100 text-red-700 border-red-200",
  orange: "bg-orange-100 text-orange-700 border-orange-200",
  yellow: "bg-yellow-100 text-yellow-800 border-yellow-200",
  green:  "bg-green-100 text-green-700 border-green-200",
  cyan:   "bg-cyan-100 text-cyan-700 border-cyan-200",
  blue:   "bg-blue-100 text-blue-700 border-blue-200",
  purple: "bg-purple-100 text-purple-700 border-purple-200",
  pink:   "bg-pink-100 text-pink-700 border-pink-200",
  brown:  "bg-amber-100 text-amber-800 border-amber-200",
}

// Normalize: black is not allowed as a category color anymore.
// Legacy data with black falls back to gray.
export function normalizeCategoryColor(color?: string): string {
  return (color && BADGE_CLASSES[color]) ? color : "gray"
}

export function getCategoryColorClass(color: string): string {
  return BADGE_CLASSES[normalizeCategoryColor(color)] || BADGE_CLASSES.gray
}

export const DEFAULT_CATEGORIES = [
  { name: "家庭", color: "pink" },
  { name: "学校", color: "cyan" },
  { name: "学习", color: "blue" },
  { name: "兴趣", color: "orange" },
  { name: "工作", color: "green" },
  { name: "资料", color: "purple" },
  { name: "想法", color: "yellow" },
  { name: "待办", color: "red" },
  { name: "生活", color: "brown" },
  { name: "灵感", color: "purple" },
  { name: "归档", color: "gray" },
]
