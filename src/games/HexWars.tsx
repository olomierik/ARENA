// ─── HEX WARS — Turn-based territory control ──────────────────────────────────
// Two players compete on a hex grid. Claim hexes, attack neighbours, fortify.
// Pure canvas, no external deps. Playable vs local opponent or bot.

import { useRef, useEffect, useCallback, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { RotateCcw, Zap, Shield, Swords, Flag } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Hex {
  q: number; r: number   // axial coordinates
  owner: 0 | 1 | null    // 0=p1, 1=p2, null=neutral
  strength: number        // 1-5
  isBase: boolean
}

interface HexState {
  hexes: Hex[]
  turn: 0 | 1
  round: number
  maxRounds: number
  ap: [number, number]     // action points per player
  maxAP: [number, number]
  selected: [number, number] | null  // [q, r]
  phase: 'select' | 'action'
  action: 'capture' | 'fortify' | 'attack'
  scores: [number, number]
  gameOver: boolean
  winner: 0 | 1 | null
  log: string[]
}

// ─── Hex Math ─────────────────────────────────────────────────────────────────

const SQRT3 = Math.sqrt(3)
function hexToPixel(q: number, r: number, size: number, ox: number, oy: number) {
  return {
    x: ox + size * (SQRT3 * q + SQRT3 / 2 * r),
    y: oy + size * (3 / 2 * r),
  }
}
function pixelToHex(px: number, py: number, size: number, ox: number, oy: number) {
  const q = (SQRT3 / 3 * (px - ox) - 1 / 3 * (py - oy)) / size
  const r = (2 / 3 * (py - oy)) / size
  return cubeRound(q, r)
}
function cubeRound(q: number, r: number) {
  const s = -q - r
  let rq = Math.round(q), rr = Math.round(r), rs = Math.round(s)
  const dq = Math.abs(rq - q), dr = Math.abs(rr - r), ds = Math.abs(rs - s)
  if (dq > dr && dq > ds) rq = -rr - rs
  else if (dr > ds) rr = -rq - rs
  return { q: rq, r: rr }
}
const DIRS = [[1,0],[0,1],[-1,1],[-1,0],[0,-1],[1,-1]] as const
function neighbours(q: number, r: number) {
  return DIRS.map(([dq, dr]) => ({ q: q + dq, r: r + dr }))
}
function hexDist(q1: number, r1: number, q2: number, r2: number) {
  return Math.max(Math.abs(q1 - q2), Math.abs(r1 - r2), Math.abs(-q1 - r1 + q2 + r2))
}

// ─── Initial State ────────────────────────────────────────────────────────────

const GRID_RADIUS = 4

function makeHexGrid(): Hex[] {
  const hexes: Hex[] = []
  for (let q = -GRID_RADIUS; q <= GRID_RADIUS; q++) {
    for (let r = -GRID_RADIUS; r <= GRID_RADIUS; r++) {
      if (Math.abs(q + r) <= GRID_RADIUS) {
        hexes.push({ q, r, owner: null, strength: 1, isBase: false })
      }
    }
  }
  // Assign bases
  const p1Base = hexes.find(h => h.q === -GRID_RADIUS && h.r === 0)
  const p2Base = hexes.find(h => h.q === GRID_RADIUS  && h.r === 0)
  if (p1Base) { p1Base.owner = 0; p1Base.strength = 3; p1Base.isBase = true }
  if (p2Base) { p2Base.owner = 1; p2Base.strength = 3; p2Base.isBase = true }
  // Give each player 2 starting neighbours
  neighbours(-GRID_RADIUS, 0).slice(0, 2).forEach(n => {
    const h = hexes.find(x => x.q === n.q && x.r === n.r)
    if (h) { h.owner = 0; h.strength = 1 }
  })
  neighbours(GRID_RADIUS, 0).slice(0, 2).forEach(n => {
    const h = hexes.find(x => x.q === n.q && x.r === n.r)
    if (h) { h.owner = 1; h.strength = 1 }
  })
  return hexes
}

function makeInitialState(): HexState {
  return {
    hexes: makeHexGrid(),
    turn: 0,
    round: 1,
    maxRounds: 20,
    ap: [4, 4],
    maxAP: [4, 4],
    selected: null,
    phase: 'select',
    action: 'capture',
    scores: [0, 0],
    gameOver: false,
    winner: null,
    log: ['Hex Wars started — Player 1 goes first'],
  }
}

function calcScore(hexes: Hex[]): [number, number] {
  const s0 = hexes.filter(h => h.owner === 0).reduce((a, h) => a + h.strength, 0)
  const s1 = hexes.filter(h => h.owner === 1).reduce((a, h) => a + h.strength, 0)
  return [s0, s1]
}

// ─── Bot AI (deterministic) ───────────────────────────────────────────────────

function botMove(state: HexState): HexState {
  let s = { ...state }
  const botPlayer = 1

  while (s.ap[botPlayer] > 0 && !s.gameOver) {
    const myHexes = s.hexes.filter(h => h.owner === botPlayer)
    const frontier: { hex: Hex; target: Hex; priority: number }[] = []

    for (const mine of myHexes) {
      for (const n of neighbours(mine.q, mine.r)) {
        const target = s.hexes.find(h => h.q === n.q && h.r === n.r)
        if (!target) continue
        if (target.owner === botPlayer) {
          // fortify weak hexes
          if (target.strength < 4 && target.isBase) {
            frontier.push({ hex: mine, target, priority: 5 })
          }
        } else if (target.owner === null) {
          // expand to neutral
          frontier.push({ hex: mine, target, priority: 3 })
        } else {
          // attack enemy
          const canAttack = mine.strength > target.strength
          frontier.push({ hex: mine, target, priority: canAttack ? 8 : 1 })
        }
      }
    }

    if (frontier.length === 0) break
    frontier.sort((a, b) => b.priority - a.priority)
    const best = frontier[0]

    if (best.target.owner === null) {
      s = applyCapture(s, botPlayer, best.hex, best.target)
    } else if (best.target.owner !== botPlayer) {
      s = applyAttack(s, botPlayer, best.hex, best.target)
    } else {
      s = applyFortify(s, botPlayer, best.hex, best.target)
    }
  }

  return endTurn(s)
}

// ─── Game Logic ───────────────────────────────────────────────────────────────

function applyCapture(s: HexState, player: 0 | 1, _from: Hex, target: Hex): HexState {
  if (s.ap[player] < 1) return s
  const hexes = s.hexes.map(h =>
    h.q === target.q && h.r === target.r ? { ...h, owner: player, strength: 1 } : h
  )
  const ap = [...s.ap] as [number, number]
  ap[player] -= 1
  return { ...s, hexes, ap, log: [`P${player + 1} claimed (${target.q},${target.r})`, ...s.log].slice(0, 20) }
}

function applyAttack(s: HexState, player: 0 | 1, from: Hex, target: Hex): HexState {
  if (s.ap[player] < 2) return s
  const attacker = from.strength
  const defender = target.strength
  const hexes = s.hexes.map(h => {
    if (h.q !== target.q || h.r !== target.r) return h
    if (attacker > defender) {
      return { ...h, owner: player, strength: Math.max(1, attacker - defender) }
    } else {
      return { ...h, strength: Math.max(1, defender - attacker) }
    }
  })
  const ap = [...s.ap] as [number, number]
  ap[player] -= 2
  const result = attacker > defender ? 'captured!' : 'defended!'
  return { ...s, hexes, ap, log: [`P${player + 1} attacks (${target.q},${target.r}) — ${result}`, ...s.log].slice(0, 20) }
}

function applyFortify(s: HexState, player: 0 | 1, _from: Hex, target: Hex): HexState {
  if (s.ap[player] < 1 || target.strength >= 5) return s
  const hexes = s.hexes.map(h =>
    h.q === target.q && h.r === target.r ? { ...h, strength: Math.min(5, h.strength + 1) } : h
  )
  const ap = [...s.ap] as [number, number]
  ap[player] -= 1
  return { ...s, hexes, ap, log: [`P${player + 1} fortified (${target.q},${target.r})`, ...s.log].slice(0, 20) }
}

function endTurn(s: HexState): HexState {
  const nextTurn = (s.turn === 0 ? 1 : 0)
  const nextRound = nextTurn === 0 ? s.round + 1 : s.round
  const scores = calcScore(s.hexes)
  const gameOver = nextRound > s.maxRounds ||
    s.hexes.find(h => h.isBase && h.owner === 0 && s.hexes.find(b => b.isBase && b.owner !== 0)) !== undefined
  let winner: 0 | 1 | null = null
  if (gameOver) {
    if (scores[0] > scores[1]) winner = 0
    else if (scores[1] > scores[0]) winner = 1
    else winner = null
  }
  const ap = [...s.ap] as [number, number]
  ap[nextTurn] = s.maxAP[nextTurn]
  return {
    ...s,
    turn: nextTurn,
    round: nextRound,
    ap,
    scores,
    selected: null,
    phase: 'select',
    gameOver,
    winner,
    log: gameOver
      ? [`Game over — ${winner !== null ? `P${winner + 1} wins!` : 'Draw!'}`, ...s.log].slice(0, 20)
      : s.log,
  }
}

// ─── Palette ──────────────────────────────────────────────────────────────────

const P_COLORS = ['#3B82F6', '#EF4444'] as const          // P1=blue P2=red
const P_LIGHT  = ['#93C5FD', '#FCA5A5'] as const
const NEUTRAL  = '#1E293B'
const BORDER   = '#334155'
const BASE_GLOW = ['rgba(59,130,246,0.5)', 'rgba(239,68,68,0.5)'] as const
const SEL_COLOR = '#FBBF24'

// ─── Canvas Renderer ──────────────────────────────────────────────────────────

function drawHexWars(
  ctx: CanvasRenderingContext2D,
  state: HexState,
  size: number,
  ox: number,
  oy: number,
  hovered: { q: number; r: number } | null,
) {
  const { width, height } = ctx.canvas

  // Background
  ctx.fillStyle = '#0F172A'
  ctx.fillRect(0, 0, width, height)

  // Grid lines faint
  ctx.strokeStyle = '#1E293B'
  ctx.lineWidth = 0.5

  for (const hex of state.hexes) {
    const { x, y } = hexToPixel(hex.q, hex.r, size, ox, oy)
    drawHex(ctx, x, y, size, BORDER, NEUTRAL, 1, false)
  }

  // Hexes
  for (const hex of state.hexes) {
    const { x, y } = hexToPixel(hex.q, hex.r, size, ox, oy)
    const isSelected = !!(state.selected && state.selected[0] === hex.q && state.selected[1] === hex.r)
    const isHovered = hovered && hovered.q === hex.q && hovered.r === hex.r

    let fill = NEUTRAL
    let border = BORDER
    let glow = false

    if (hex.owner !== null) {
      fill = hex.isBase
        ? (hex.owner === 0 ? '#1D4ED8' : '#B91C1C')
        : (hex.owner === 0 ? '#1E3A5F' : '#4A1A1A')
      border = P_COLORS[hex.owner]
      glow = hex.isBase
    }
    if (isSelected) { border = SEL_COLOR; glow = true }
    if (isHovered && !isSelected) { border = '#94A3B8' }

    if (glow) {
      ctx.shadowBlur = 12
      ctx.shadowColor = isSelected ? '#FBBF24' : (hex.owner !== null ? BASE_GLOW[hex.owner] : 'transparent')
    }

    drawHex(ctx, x, y, size, border, fill, hex.owner !== null ? 2 : 1, isSelected)

    ctx.shadowBlur = 0
    ctx.shadowColor = 'transparent'

    // Strength dots
    if (hex.owner !== null && hex.strength > 0) {
      const dotColor = P_LIGHT[hex.owner]
      for (let i = 0; i < hex.strength; i++) {
        const angle = ((i / hex.strength) * 2 - 0.5) * Math.PI
        const dx = Math.cos(angle) * (size * 0.4)
        const dy = Math.sin(angle) * (size * 0.4)
        ctx.beginPath()
        ctx.arc(x + dx, y + dy, size * 0.1, 0, Math.PI * 2)
        ctx.fillStyle = dotColor
        ctx.fill()
      }
    }

    // Base crown
    if (hex.isBase) {
      ctx.font = `${size * 0.55}px serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(hex.owner === 0 ? '♟' : '♜', x, y)
    }
  }

  // Highlight reachable from selection
  if (state.selected && state.phase === 'action') {
    const [sq, sr] = state.selected
    for (const n of neighbours(sq, sr)) {
      const target = state.hexes.find(h => h.q === n.q && h.r === n.r)
      if (!target) continue
      const { x, y } = hexToPixel(n.q, n.r, size, ox, oy)
      ctx.beginPath()
      hexPath(ctx, x, y, size * 0.85)
      ctx.strokeStyle = SEL_COLOR
      ctx.lineWidth = 1.5
      ctx.setLineDash([3, 3])
      ctx.stroke()
      ctx.setLineDash([])
    }
  }
}

function drawHex(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, size: number,
  border: string, fill: string,
  lineWidth: number,
  selected: boolean,
) {
  ctx.beginPath()
  hexPath(ctx, x, y, size - 1)
  ctx.fillStyle = fill
  ctx.fill()
  ctx.strokeStyle = border
  ctx.lineWidth = lineWidth + (selected ? 1 : 0)
  ctx.stroke()
}

function hexPath(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6
    const px = x + size * Math.cos(angle)
    const py = y + size * Math.sin(angle)
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.closePath()
}

// ─── Component ────────────────────────────────────────────────────────────────

interface HexWarsProps {
  playerName?: string
  onMatchEnd?: (winner: 0 | 1 | null, scores: [number, number]) => void
  mode?: 'pvb' | 'pvp'    // player vs bot | player vs player (local)
}

export function HexWars({ playerName = 'You', onMatchEnd, mode = 'pvb' }: HexWarsProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [gameState, setGameState] = useState<HexState>(makeInitialState)
  const [hovered, setHovered] = useState<{ q: number; r: number } | null>(null)
  const [action, setAction] = useState<'capture' | 'fortify' | 'attack'>('capture')
  const [botThinking, setBotThinking] = useState(false)
  const animRef = useRef<number>(0)

  const SIZE = 36
  const isPlayer = !gameState.gameOver && gameState.turn === 0
  const isBot    = !gameState.gameOver && gameState.turn === 1 && mode === 'pvb'

  // Canvas dimensions
  const CW = 640, CH = 580
  const OX = CW / 2, OY = CH / 2

  // ─── Draw loop ──────────────────────────────────────────────────────────────
  const draw = useCallback((state: HexState, hov: { q: number; r: number } | null) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    drawHexWars(ctx, state, SIZE, OX, OY, hov)
  }, [OX, OY])

  useEffect(() => {
    draw(gameState, hovered)
  }, [gameState, hovered, draw])

  // ─── Bot move ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isBot) return
    // schedule thinking=true on next tick (avoids set-state-in-effect)
    const startId = setTimeout(() => setBotThinking(true), 0)
    const t = setTimeout(() => {
      setBotThinking(false)
      setGameState(prev => {
        const next = botMove(prev)
        if (next.gameOver) onMatchEnd?.(next.winner, next.scores)
        return next
      })
    }, 900)
    return () => { clearTimeout(startId); clearTimeout(t) }
  }, [isBot, onMatchEnd])

  // ─── Pointer events ─────────────────────────────────────────────────────────
  function getHex(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = canvasRef.current!.getBoundingClientRect()
    const scaleX = CW / rect.width
    const scaleY = CH / rect.height
    const px = (e.clientX - rect.left) * scaleX
    const py = (e.clientY - rect.top)  * scaleY
    return pixelToHex(px, py, SIZE, OX, OY)
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    const h = getHex(e)
    const hex = gameState.hexes.find(x => x.q === h.q && x.r === h.r)
    setHovered(hex ? h : null)
  }

  function onPointerLeave() { setHovered(null) }

  function onClick(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!isPlayer || botThinking) return
    const h = getHex(e)
    const hex = gameState.hexes.find(x => x.q === h.q && x.r === h.r)
    if (!hex) return

    setGameState(prev => {
      if (prev.phase === 'select') {
        // Select own hex
        if (hex.owner === 0) {
          return { ...prev, selected: [hex.q, hex.r], phase: 'action' }
        }
        return prev
      }

      // Phase: action
      const [sq, sr] = prev.selected!
      const from = prev.hexes.find(x => x.q === sq && x.r === sr)!
      const dist  = hexDist(sq, sr, hex.q, hex.r)

      if (dist !== 1) {
        // Clicked same hex → deselect
        if (hex.q === sq && hex.r === sr) {
          return { ...prev, selected: null, phase: 'select' }
        }
        // Clicked different own hex → re-select
        if (hex.owner === 0) {
          return { ...prev, selected: [hex.q, hex.r] }
        }
        return prev
      }

      // Neighbour action
      let next = prev
      if (hex.owner === null) {
        if (action === 'capture') next = applyCapture(prev, 0, from, hex)
        else if (action === 'fortify') next = prev // can't fortify neutral
      } else if (hex.owner === 0) {
        if (action === 'fortify') next = applyFortify(prev, 0, from, hex)
      } else {
        if (action === 'attack') next = applyAttack(prev, 0, from, hex)
        else if (action === 'capture') next = applyCapture(prev, 0, from, hex) // auto-capture weak
      }

      if (next.ap[0] === 0) {
        next = endTurn(next)
        if (next.gameOver) onMatchEnd?.(next.winner, next.scores)
      }
      return { ...next, selected: next.ap[0] > 0 ? next.selected : null, phase: next.ap[0] > 0 ? next.phase : 'select' }
    })
  }

  function endMyTurn() {
    setGameState(prev => {
      const next = endTurn(prev)
      if (next.gameOver) onMatchEnd?.(next.winner, next.scores)
      return next
    })
  }

  function restart() {
    cancelAnimationFrame(animRef.current)
    setGameState(makeInitialState())
    setHovered(null)
    setBotThinking(false)
  }

  const gs = gameState
  const p1Count = gs.hexes.filter(h => h.owner === 0).length
  const p2Count = gs.hexes.filter(h => h.owner === 1).length

  return (
    <div className="flex flex-col items-center gap-3 w-full select-none">

      {/* Score bar */}
      <div className="flex items-center justify-between w-full max-w-[640px] px-1">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-blue-500" />
          <span className="font-display text-sm text-white font-semibold">{playerName}</span>
          <span className="text-blue-400 font-mono text-sm tabular-nums">{p1Count} hexes</span>
          <span className="text-[#94A3B8] text-xs">AP: {gs.ap[0]}/{gs.maxAP[0]}</span>
        </div>
        <div className="text-center">
          <span className="text-[#64748B] text-xs font-mono">ROUND {gs.round}/{gs.maxRounds}</span>
          {gs.gameOver && (
            <span className={`ml-2 text-xs font-display font-bold ${gs.winner === 0 ? 'text-blue-400' : gs.winner === 1 ? 'text-red-400' : 'text-yellow-400'}`}>
              {gs.winner === 0 ? 'YOU WIN' : gs.winner === 1 ? 'BOT WINS' : 'DRAW'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[#94A3B8] text-xs">AP: {gs.ap[1]}/{gs.maxAP[1]}</span>
          <span className="text-red-400 font-mono text-sm tabular-nums">{p2Count} hexes</span>
          <span className="font-display text-sm text-white font-semibold">{mode === 'pvb' ? 'BOT' : 'P2'}</span>
          <div className="w-3 h-3 rounded-sm bg-red-500" />
        </div>
      </div>

      {/* Score progress bar */}
      <div className="w-full max-w-[640px] h-1.5 rounded-full bg-[#1E293B] overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-300"
          style={{ width: `${(p1Count / (p1Count + p2Count + 1)) * 100}%` }}
        />
      </div>

      {/* Canvas */}
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={CW}
          height={CH}
          className="rounded-xl border border-[#1E293B] cursor-crosshair touch-none"
          style={{ width: 'min(640px, 100vw - 2rem)', height: 'auto', imageRendering: 'auto' }}
          onPointerMove={onPointerMove}
          onPointerLeave={onPointerLeave}
          onPointerDown={onClick}
        />

        {/* Bot thinking overlay */}
        <AnimatePresence>
          {botThinking && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/20 backdrop-blur-[1px]"
            >
              <div className="bg-[#0F172A]/90 border border-red-500/30 rounded-xl px-6 py-3 flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                <span className="text-red-400 font-display text-sm">BOT CALCULATING...</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Game over overlay */}
        <AnimatePresence>
          {gs.gameOver && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/50 backdrop-blur-sm"
            >
              <div className="bg-[#0F172A] border border-[#334155] rounded-2xl px-8 py-6 text-center shadow-2xl">
                <div className={`text-4xl font-display font-black mb-2 ${gs.winner === 0 ? 'text-blue-400' : gs.winner === 1 ? 'text-red-400' : 'text-yellow-400'}`}>
                  {gs.winner === 0 ? 'VICTORY' : gs.winner === 1 ? 'DEFEAT' : 'DRAW'}
                </div>
                <div className="text-[#94A3B8] text-sm mb-4">
                  Final: {gs.scores[0]} — {gs.scores[1]}
                </div>
                <button
                  onClick={restart}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-display text-sm transition-colors"
                >
                  PLAY AGAIN
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Action toolbar */}
      {isPlayer && !gs.gameOver && (
        <div className="flex items-center gap-2 flex-wrap justify-center">
          {((['capture', 'attack', 'fortify'] as const)).map(act => {
            const Icon = act === 'capture' ? Flag : act === 'attack' ? Swords : Shield
            const colors: Record<typeof act, string> = {
              capture: 'border-green-500/50 text-green-400',
              attack:  'border-red-500/50 text-red-400',
              fortify: 'border-blue-500/50 text-blue-400',
            }
            return (
              <button
                key={act}
                onClick={() => setAction(act)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-display font-semibold transition-all ${action === act ? colors[act] + ' bg-white/5' : 'border-[#334155] text-[#64748B] hover:border-[#475569]'}`}
              >
                <Icon size={12} />
                {act.toUpperCase()}
              </button>
            )
          })}
          <button
            onClick={endMyTurn}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-yellow-500/50 text-yellow-400 text-xs font-display font-semibold hover:bg-yellow-500/10 transition-all"
          >
            <Zap size={12} />
            END TURN
          </button>
          <button
            onClick={restart}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg border border-[#334155] text-[#64748B] text-xs hover:border-[#475569] transition-all"
          >
            <RotateCcw size={12} />
          </button>
        </div>
      )}

      {/* Log */}
      <div className="w-full max-w-[640px] bg-[#0F172A] border border-[#1E293B] rounded-xl p-3 h-20 overflow-y-auto">
        {gs.log.map((line, i) => (
          <div key={i} className={`text-xs font-mono ${i === 0 ? 'text-[#94A3B8]' : 'text-[#334155]'}`}>{line}</div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-[10px] text-[#475569] flex-wrap justify-center">
        <span>● = territory strength (1–5 dots)</span>
        <span>♟/♜ = base (protect at all costs)</span>
        <span>Click own hex → select → click neighbour to act</span>
      </div>
    </div>
  )
}
