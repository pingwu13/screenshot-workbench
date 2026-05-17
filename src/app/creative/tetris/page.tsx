"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { ArrowLeft, Play, Pause, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card as UICard, CardContent } from "@/components/ui/card"
import { ProtectedPage } from "@/components/layout/protected-page"
import Link from "next/link"
import { cn } from "@/lib/utils"

const COLS = 10
const ROWS = 20
const EMPTY = ""

type Cell = string
type Grid = Cell[][]

// Tetromino definitions: [row][col] offsets
const PIECES: Record<string, { shape: number[][]; color: string }> = {
  I: { shape: [[0,0],[0,1],[0,2],[0,3]], color: "bg-cyan-400" },
  O: { shape: [[0,0],[0,1],[1,0],[1,1]], color: "bg-yellow-400" },
  T: { shape: [[0,1],[1,0],[1,1],[1,2]], color: "bg-purple-400" },
  S: { shape: [[0,1],[0,2],[1,0],[1,1]], color: "bg-green-400" },
  Z: { shape: [[0,0],[0,1],[1,1],[1,2]], color: "bg-red-400" },
  J: { shape: [[0,0],[1,0],[1,1],[1,2]], color: "bg-blue-400" },
  L: { shape: [[0,2],[1,0],[1,1],[1,2]], color: "bg-orange-400" },
}
const PIECE_KEYS = Object.keys(PIECES)

function createGrid(): Grid {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(EMPTY))
}

function randomPiece(): { key: string; shape: number[][]; color: string; x: number; y: number } {
  const key = PIECE_KEYS[Math.floor(Math.random() * PIECE_KEYS.length)]
  const p = PIECES[key]
  const minCol = Math.min(...p.shape.map(([_, c]) => c))
  const maxCol = Math.max(...p.shape.map(([_, c]) => c))
  const w = maxCol - minCol + 1
  return { key, shape: p.shape, color: p.color, x: Math.floor((COLS - w) / 2), y: 0 }
}

function rotateShape(shape: number[][]): number[][] {
  const maxR = Math.max(...shape.map(([r]) => r))
  return shape.map(([r, c]) => [c, maxR - r])
}

function isValid(grid: Grid, shape: number[][], x: number, y: number): boolean {
  return shape.every(([r, c]) => {
    const nr = r + y; const nc = c + x
    return nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && grid[nr][nc] === EMPTY
  })
}

function mergePiece(grid: Grid, shape: number[][], x: number, y: number, color: string): Grid {
  const next = grid.map((r) => [...r])
  shape.forEach(([r, c]) => { next[r + y][c + x] = color })
  return next
}

function clearLines(grid: Grid): { grid: Grid; cleared: number } {
  const remaining = grid.filter((row) => row.some((c) => c === EMPTY))
  const cleared = ROWS - remaining.length
  const emptyRows = Array.from({ length: cleared }, () => Array(COLS).fill(EMPTY))
  return { grid: [...emptyRows, ...remaining], cleared }
}

const SCORE_TABLE = [0, 100, 300, 500, 800]

export default function TetrisPage() {
  const [grid, setGrid] = useState<Grid>(createGrid)
  const [currentPiece, setCurrentPiece] = useState<{
    key: string; shape: number[][]; color: string; x: number; y: number
  } | null>(null)
  const [score, setScore] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [paused, setPaused] = useState(false)
  const [started, setStarted] = useState(false)

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const gridRef = useRef(grid)
  const pieceRef = useRef(currentPiece)
  const pausedRef = useRef(paused)
  const overRef = useRef(gameOver)

  gridRef.current = grid
  pieceRef.current = currentPiece
  pausedRef.current = paused
  overRef.current = gameOver

  const spawnPiece = useCallback(() => {
    const p = randomPiece()
    setCurrentPiece(p)
    if (!isValid(gridRef.current, p.shape, p.x, p.y)) {
      setGameOver(true)
    }
  }, [])

  const lockPiece = useCallback(() => {
    const piece = pieceRef.current
    if (!piece) return
    const merged = mergePiece(gridRef.current, piece.shape, piece.x, piece.y, piece.color)
    const { grid: cleared, cleared: count } = clearLines(merged)
    setGrid(cleared)
    if (count > 0) {
      setScore((prev) => prev + (SCORE_TABLE[count] || count * 200))
    }
    return cleared
  }, [])

  const tick = useCallback(() => {
    if (pausedRef.current || overRef.current) return
    const piece = pieceRef.current
    if (!piece) return
    if (isValid(gridRef.current, piece.shape, piece.x, piece.y + 1)) {
      setCurrentPiece((prev) => prev ? { ...prev, y: prev.y + 1 } : null)
    } else {
      lockPiece()
      spawnPiece()
    }
  }, [lockPiece, spawnPiece])

  const startGame = useCallback(() => {
    setGrid(createGrid())
    setScore(0)
    setGameOver(false)
    setPaused(false)
    setStarted(true)
    const p = randomPiece()
    setCurrentPiece(p)
  }, [])

  // Game loop
  useEffect(() => {
    if (!started || gameOver) return
    intervalRef.current = setInterval(tick, 400)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [started, gameOver, tick])

  // Keyboard controls
  const handleKey = useCallback((e: KeyboardEvent) => {
    if (!started || gameOver || pausedRef.current) return
    const piece = pieceRef.current
    if (!piece) return
    const g = gridRef.current

    if (e.key === "ArrowLeft" && isValid(g, piece.shape, piece.x - 1, piece.y)) {
      e.preventDefault()
      setCurrentPiece((prev) => prev ? { ...prev, x: prev.x - 1 } : null)
    } else if (e.key === "ArrowRight" && isValid(g, piece.shape, piece.x + 1, piece.y)) {
      e.preventDefault()
      setCurrentPiece((prev) => prev ? { ...prev, x: prev.x + 1 } : null)
    } else if (e.key === "ArrowDown" && isValid(g, piece.shape, piece.x, piece.y + 1)) {
      e.preventDefault()
      setCurrentPiece((prev) => prev ? { ...prev, y: prev.y + 1 } : null)
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      const rotated = rotateShape(piece.shape)
      if (isValid(g, rotated, piece.x, piece.y)) {
        setCurrentPiece((prev) => prev ? { ...prev, shape: rotated } : null)
      }
    } else if (e.key === " ") {
      e.preventDefault()
      let ny = piece.y
      while (isValid(g, piece.shape, piece.x, ny + 1)) ny++
      setCurrentPiece((prev) => prev ? { ...prev, y: ny } : null)
    }
  }, [started, gameOver])

  useEffect(() => {
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [handleKey])

  // Render grid with current piece merged
  const renderGrid = (): Grid => {
    const display = grid.map((r) => [...r])
    if (currentPiece && !gameOver) {
      currentPiece.shape.forEach(([r, c]) => {
        const nr = r + currentPiece.y; const nc = c + currentPiece.x
        if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
          display[nr][nc] = currentPiece.color
        }
      })
    }
    return display
  }

  const display = renderGrid()

  return (
    <ProtectedPage>
      <div className="max-w-xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Link href="/creative">
            <Button variant="ghost" size="sm" className="gap-1.5">
              <ArrowLeft className="h-4 w-4" />返回创意栏
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            {started && !gameOver && (
              <Button variant="outline" size="sm" className="gap-1.5"
                onClick={() => setPaused((prev) => !prev)}>
                {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                {paused ? "继续" : "暂停"}
              </Button>
            )}
            <Button variant="outline" size="sm" className="gap-1.5" onClick={startGame}>
              <RotateCcw className="h-4 w-4" />重新开始
            </Button>
          </div>
        </div>

        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">俄罗斯方块</h1>
          <p className="text-muted-foreground text-sm">经典益智游戏，消行得分</p>
        </div>

        <div className="flex justify-center gap-6">
          <UICard className="w-44 text-center rounded-xl">
            <CardContent className="py-3">
              <p className="text-xs text-muted-foreground">分数</p>
              <p className="text-2xl font-bold font-mono">{score}</p>
            </CardContent>
          </UICard>
          {gameOver && (
            <UICard className="w-44 text-center rounded-xl border-destructive/50">
              <CardContent className="py-3">
                <p className="text-xs text-destructive font-medium">游戏结束</p>
                <p className="text-sm text-muted-foreground mt-0.5">点击重新开始</p>
              </CardContent>
            </UICard>
          )}
        </div>

        {/* Board */}
        <div className="flex justify-center">
          <div
            className={cn(
              "inline-grid border-2 rounded-lg overflow-hidden bg-muted/30",
              gameOver ? "border-destructive/40" : "border-border"
            )}
            style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}
          >
            {display.map((row, ri) =>
              row.map((cell, ci) => (
                <div
                  key={`${ri}-${ci}`}
                  className={cn(
                    "w-6 h-6 sm:w-7 sm:h-7 border border-background/20",
                    cell || "bg-transparent",
                    cell
                  )}
                />
              ))
            )}
          </div>
        </div>

        {!started && (
          <div className="text-center">
            <Button size="lg" className="gap-2" onClick={startGame}>
              <Play className="h-5 w-5" />开始游戏
            </Button>
          </div>
        )}

        {paused && started && (
          <div className="text-center py-4">
            <p className="text-lg font-semibold text-muted-foreground">已暂停</p>
            <p className="text-xs text-muted-foreground mt-1">点击「继续」恢复游戏</p>
          </div>
        )}

        <div className="text-xs text-muted-foreground text-center space-y-0.5">
          <p>← → 移动 &nbsp; ↑ 旋转 &nbsp; ↓ 加速下落 &nbsp; 空格 直接落底</p>
        </div>
      </div>
    </ProtectedPage>
  )
}
