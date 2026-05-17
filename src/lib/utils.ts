import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Unified clickable card hover effect: lift + shadow + smooth transition */
export const CLICKABLE_CARD =
  "cursor-pointer transition-all duration-150 ease-out hover:-translate-y-px hover:shadow-md"
