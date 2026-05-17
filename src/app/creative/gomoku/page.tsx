"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { ArrowLeft, RotateCcw, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ProtectedPage } from "@/components/layout/protected-page"
import Link from "next/link"

const BOARD_SIZE = 19
const EMPTY = 0
const BLACK = 1 // human
const WHITE = 2 // AI

type Cell = typeof EMPTY | typeof BLACK | typeof WHITE
type Board = Cell[][]

// Star points for 19x19 board (0-based indices)
const STAR_POINTS = [
  [3, 3], [3, 9], [3, 15],
  [9, 3], [9, 9], [9, 15],
  [15, 3], [15, 9], [15, 15],
]

const DIRECTIONS = [[0, 1], [1, 0], [1, 1], [1, -1]]

// ---- Board helpers ----

function createBoard(): Board {
  return Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(EMPTY))
}

function checkWin(board: Board, row: number, col: number, player: Cell): boolean {
  for (const [dr, dc] of DIRECTIONS) {
    let count = 1
    for (let i = 1; i < 5; i++) {
      const r = row + dr * i; const c = col + dc * i
      if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && board[r][c] === player) count++
      else break
    }
    for (let i = 1; i < 5; i++) {
      const r = row - dr * i; const c = col - dc * i
      if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && board[r][c] === player) count++
      else break
    }
    if (count >= 5) return true
  }
  return false
}

function isBoardFull(board: Board): boolean {
  return board.every((row) => row.every((cell) => cell !== EMPTY))
}

// ---- AI ----

const PATTERN_SCORES: Record<string, number> = {
  "five": 1000000,
  "open_4": 100000,
  "closed_4": 10000,
  "open_3": 5000,
  "closed_3": 500,
  "open_2": 200,
  "closed_2": 20,
  "open_1": 10,
  "closed_1": 1,
}

function evaluateDirection(
  board: Board, row: number, col: number, dr: number, dc: number, player: Cell
): number {
  let count = 0
  let openEnds = 0

  // Forward
  for (let i = 1; i <= 5; i++) {
    const r = row + dr * i; const c = col + dc * i
    if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) break
    if (board[r][c] === player) count++
    else if (board[r][c] === EMPTY) { openEnds++; break }
    else break
  }

  // Backward
  for (let i = 1; i <= 5; i++) {
    const r = row - dr * i; const c = col - dc * i
    if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) break
    if (board[r][c] === player) count++
    else if (board[r][c] === EMPTY) { openEnds++; break }
    else break
  }

  if (count >= 4) return count >= 5 ? PATTERN_SCORES["five"] : PATTERN_SCORES["open_4"]
  if (count >= 3) {
    if (openEnds >= 2) return PATTERN_SCORES["open_3"]
    if (openEnds >= 1) return PATTERN_SCORES["closed_3"]
    return 0
  }
  if (count >= 2) {
    if (openEnds >= 2) return PATTERN_SCORES["open_2"]
    if (openEnds >= 1) return PATTERN_SCORES["closed_2"]
    return 0
  }
  if (count >= 1) {
    if (openEnds >= 2) return PATTERN_SCORES["open_1"]
    if (openEnds >= 1) return PATTERN_SCORES["closed_1"]
    return 0
  }
  return 0
}

function evaluateCell(board: Board, row: number, col: number, player: Cell): number {
  let score = 0
  for (const [dr, dc] of DIRECTIONS) {
    score += evaluateDirection(board, row, col, dr, dc, player)
  }
  return score
}

function findBestMove(board: Board): [number, number] | null {
  let bestScore = -1
  let bestMoves: [number, number][] = []

  const candidates = new Set<string>()
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] !== EMPTY) {
        for (let dr = -2; dr <= 2; dr++) {
          for (let dc = -2; dc <= 2; dc++) {
            const nr = r + dr; const nc = c + dc
            if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE && board[nr][nc] === EMPTY) {
              candidates.add(`${nr},${nc}`)
            }
          }
        }
      }
    }
  }

  if (candidates.size === 0) return [9, 9]

  for (const key of candidates) {
    const [r, c] = key.split(",").map(Number)
    const attackScore = evaluateCell(board, r, c, WHITE)
    const defenseScore = evaluateCell(board, r, c, BLACK)
    const score = Math.max(attackScore, defenseScore * 1.1) + attackScore * 0.5

    if (score > bestScore) {
      bestScore = score
      bestMoves = [[r, c]]
    } else if (score === bestScore) {
      bestMoves.push([r, c])
    }
  }

  if (bestMoves.length === 0) return null
  return bestMoves[Math.floor(Math.random() * bestMoves.length)]
}

// ---- Canvas drawing constants ----
const CANVAS_SIZE = 570
const PADDING = 28
const CELL_SIZE = (CANVAS_SIZE - PADDING * 2) / (BOARD_SIZE - 1)
const STONE_RADIUS = CELL_SIZE * 0.44
const STAR_RADIUS = 4

function intersectionToPixel(row: number, col: number) {
  return {
    x: PADDING + col * CELL_SIZE,
    y: PADDING + row * CELL_SIZE,
  }
}

function pixelToIntersection(px: number, py: number): { row: number; col: number } | null {
  const col = Math.round((px - PADDING) / CELL_SIZE)
  const row = Math.round((py - PADDING) / CELL_SIZE)
  if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) return null
  // Check if click is within reasonable distance of the intersection
  const { x, y } = intersectionToPixel(row, col)
  const dist = Math.sqrt((px - x) ** 2 + (py - y) ** 2)
  if (dist > CELL_SIZE * 0.45) return null
  return { row, col }
}

// ---- Component ----

export default function GomokuPage() {
  const [board, setBoard] = useState<Board>(createBoard)
  const [turn, setTurn] = useState<Cell>(BLACK)
  const [winner, setWinner] = useState<Cell>(EMPTY)
  const [lastMove, setLastMove] = useState<[number, number] | null>(null)
  const [aiThinking, setAiThinking] = useState(false)
  const [hoverPos, setHoverPos] = useState<{ row: number; col: number } | null>(null)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const boardRef = useRef(board)
  const aiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  boardRef.current = board

  useEffect(() => {
    return () => { if (aiTimerRef.current) clearTimeout(aiTimerRef.current) }
  }, [])

  // ---- Drawing ----
  const drawBoard = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = CANVAS_SIZE * dpr
    canvas.height = CANVAS_SIZE * dpr
    canvas.style.width = `${CANVAS_SIZE}px`
    canvas.style.height = `${CANVAS_SIZE}px`
    ctx.scale(dpr, dpr)

    // Board background - warm wood brown
    ctx.fillStyle = "#df9849"
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)

    // Outer dark border
    ctx.strokeStyle = "#3a2010"
    ctx.lineWidth = 4
    ctx.strokeRect(PADDING - CELL_SIZE / 2, PADDING - CELL_SIZE / 2,
      CELL_SIZE * (BOARD_SIZE - 1) + CELL_SIZE,
      CELL_SIZE * (BOARD_SIZE - 1) + CELL_SIZE)

    // Inner fine border
    ctx.strokeStyle = "#5c3a1e"
    ctx.lineWidth = 1
    ctx.strokeRect(PADDING - CELL_SIZE / 2 + 2, PADDING - CELL_SIZE / 2 + 2,
      CELL_SIZE * (BOARD_SIZE - 1) + CELL_SIZE - 4,
      CELL_SIZE * (BOARD_SIZE - 1) + CELL_SIZE - 4)

    // Grid lines
    ctx.strokeStyle = "#4a2a14"
    ctx.lineWidth = 1
    for (let i = 0; i < BOARD_SIZE; i++) {
      const pos = PADDING + i * CELL_SIZE
      // Horizontal
      ctx.beginPath()
      ctx.moveTo(PADDING, pos)
      ctx.lineTo(PADDING + (BOARD_SIZE - 1) * CELL_SIZE, pos)
      ctx.stroke()
      // Vertical
      ctx.beginPath()
      ctx.moveTo(pos, PADDING)
      ctx.lineTo(pos, PADDING + (BOARD_SIZE - 1) * CELL_SIZE)
      ctx.stroke()
    }

    // Star points
    for (const [r, c] of STAR_POINTS) {
      const { x, y } = intersectionToPixel(r, c)
      ctx.beginPath()
      ctx.arc(x, y, STAR_RADIUS, 0, Math.PI * 2)
      ctx.fillStyle = "#1a0e04"
      ctx.fill()
    }

    // Stones
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (board[r][c] === EMPTY) continue
        const { x, y } = intersectionToPixel(r, c)
        const isLast = lastMove && lastMove[0] === r && lastMove[1] === c

        // Stone shadow
        ctx.beginPath()
        ctx.arc(x + 1.5, y + 1.5, STONE_RADIUS, 0, Math.PI * 2)
        ctx.fillStyle = "rgba(0,0,0,0.25)"
        ctx.fill()

        // Stone body
        ctx.beginPath()
        ctx.arc(x, y, STONE_RADIUS, 0, Math.PI * 2)

        if (board[r][c] === BLACK) {
          const grad = ctx.createRadialGradient(x - STONE_RADIUS * 0.3, y - STONE_RADIUS * 0.3, STONE_RADIUS * 0.1, x, y, STONE_RADIUS)
          grad.addColorStop(0, "#555")
          grad.addColorStop(1, "#111")
          ctx.fillStyle = grad
        } else {
          const grad = ctx.createRadialGradient(x - STONE_RADIUS * 0.3, y - STONE_RADIUS * 0.3, STONE_RADIUS * 0.1, x, y, STONE_RADIUS)
          grad.addColorStop(0, "#fff")
          grad.addColorStop(0.85, "#e8e8e8")
          grad.addColorStop(1, "#bbb")
          ctx.fillStyle = grad
        }
        ctx.fill()

        // Stone border for white
        if (board[r][c] === WHITE) {
          ctx.strokeStyle = "#999"
          ctx.lineWidth = 0.8
          ctx.stroke()
        }

        // Last move marker
        if (isLast) {
          ctx.beginPath()
          ctx.arc(x, y, STONE_RADIUS * 0.3, 0, Math.PI * 2)
          ctx.fillStyle = board[r][c] === BLACK ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.5)"
          ctx.fill()
        }
      }
    }

    // Hover preview
    if (hoverPos && board[hoverPos.row][hoverPos.col] === EMPTY && winner === EMPTY && turn === BLACK && !aiThinking) {
      const { x, y } = intersectionToPixel(hoverPos.row, hoverPos.col)
      ctx.beginPath()
      ctx.arc(x, y, STONE_RADIUS, 0, Math.PI * 2)
      ctx.fillStyle = "rgba(0,0,0,0.35)"
      ctx.fill()
    }
  }, [board, lastMove, hoverPos, turn, winner, aiThinking])

  // Redraw whenever state changes
  useEffect(() => {
    drawBoard()
  }, [drawBoard])

  // ---- AI ----
  const executeAIMove = useCallback((currentBoard: Board) => {
    setAiThinking(true)
    aiTimerRef.current = setTimeout(() => {
      const move = findBestMove(currentBoard)
      if (!move) { setAiThinking(false); return }

      const [aiRow, aiCol] = move
      const newBoard = currentBoard.map((r) => [...r])
      newBoard[aiRow][aiCol] = WHITE

      setBoard(newBoard)
      setLastMove([aiRow, aiCol])

      if (checkWin(newBoard, aiRow, aiCol, WHITE)) {
        setWinner(WHITE)
        setAiThinking(false)
        return
      }
      if (isBoardFull(newBoard)) {
        setAiThinking(false)
        return
      }

      setTurn(BLACK)
      setAiThinking(false)
    }, 300)
  }, [])

  // ---- Click handling ----
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (winner !== EMPTY || turn !== BLACK || aiThinking) return

    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const scaleX = CANVAS_SIZE / rect.width
    const scaleY = CANVAS_SIZE / rect.height
    const px = (e.clientX - rect.left) * scaleX
    const py = (e.clientY - rect.top) * scaleY

    const hit = pixelToIntersection(px, py)
    if (!hit) return
    const { row, col } = hit
    if (board[row][col] !== EMPTY) return

    const newBoard = board.map((r) => [...r])
    newBoard[row][col] = BLACK

    setBoard(newBoard)
    setLastMove([row, col])
    setHoverPos(null)

    if (checkWin(newBoard, row, col, BLACK)) {
      setWinner(BLACK)
      return
    }
    if (isBoardFull(newBoard)) return

    setTurn(WHITE)
    executeAIMove(newBoard)
  }, [board, turn, winner, aiThinking, executeAIMove])

  const handleCanvasMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (winner !== EMPTY || turn !== BLACK || aiThinking) {
      if (hoverPos) setHoverPos(null)
      return
    }
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const scaleX = CANVAS_SIZE / rect.width
    const scaleY = CANVAS_SIZE / rect.height
    const px = (e.clientX - rect.left) * scaleX
    const py = (e.clientY - rect.top) * scaleY

    const hit = pixelToIntersection(px, py)
    if (!hit || board[hit.row][hit.col] !== EMPTY) {
      setHoverPos(null)
      return
    }
    setHoverPos({ row: hit.row, col: hit.col })
  }, [board, turn, winner, aiThinking, hoverPos])

  const handleCanvasLeave = useCallback(() => {
    setHoverPos(null)
  }, [])

  // ---- Reset ----
  const reset = () => {
    if (aiTimerRef.current) clearTimeout(aiTimerRef.current)
    setBoard(createBoard())
    setTurn(BLACK)
    setWinner(EMPTY)
    setLastMove(null)
    setAiThinking(false)
    setHoverPos(null)
  }

  const isDraw = !winner && isBoardFull(board)

  return (
    <ProtectedPage>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Link href="/creative">
            <Button variant="ghost" size="sm" className="gap-1.5">
              <ArrowLeft className="h-4 w-4" />返回创意栏
            </Button>
          </Link>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={reset}>
            <RotateCcw className="h-4 w-4" />重新开始
          </Button>
        </div>

        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">五子棋</h1>
          <p className="text-muted-foreground text-sm">人机对战 · 你执黑棋先手</p>
        </div>

        {/* Status */}
        <div className="text-center">
          {winner ? (
            <p className="text-lg font-semibold">
              {winner === BLACK ? "🎉 你赢了！" : "🤖 AI 获胜！"}
            </p>
          ) : isDraw ? (
            <p className="text-lg font-semibold text-muted-foreground">平局</p>
          ) : aiThinking ? (
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">AI 思考中...</span>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <span className="h-5 w-5 rounded-full bg-neutral-900 shadow" />
              <span className="text-sm font-medium">你的回合</span>
            </div>
          )}
        </div>

        {/* Canvas board */}
        <div className="flex justify-center">
          <canvas
            ref={canvasRef}
            className="rounded-sm shadow-lg cursor-pointer max-w-full"
            style={{ maxWidth: "100%", height: "auto" }}
            onClick={handleCanvasClick}
            onMouseMove={handleCanvasMove}
            onMouseLeave={handleCanvasLeave}
          />
        </div>

        <p className="text-xs text-muted-foreground text-center">
          点击交点落子 · 你执黑棋先手 · AI 执白棋
        </p>
      </div>
    </ProtectedPage>
  )
}
