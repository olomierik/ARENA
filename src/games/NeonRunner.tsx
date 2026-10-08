// ─── NEON RUNNER — Real-time endless runner ───────────────────────────────────
// Dodge incoming obstacles, collect pickups, survive as long as possible.
// Three lanes, neon aesthetic, speed increases over time.

import { useRef, useEffect, useCallback, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { RotateCcw, Trophy, Zap } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

const LANES = 3
const CW = 420, CH = 600
const LANE_W = CW / LANES
const PLAYER_W = 36, PLAYER_H = 48
const OBSTACLE_W = LANE_W - 12, OBSTACLE_H = 28
const PICKUP_R = 12

type LaneIndex = 0 | 1 | 2

interface Obstacle {
  id: number
  lane: LaneIndex
  y: number
  type: 'wall' | 'spike' | 'laser'
  color: string
}

interface Pickup {
  id: number
  lane: LaneIndex
  y: number
  type: 'boost' | 'shield' | 'score'
  color: string
}

interface RunnerState {
  lane: LaneIndex
  targetLane: LaneIndex
  laneOffset: number    // 0-1 lerp progress
  y: number             // fixed bottom position
  obstacles: Obstacle[]
  pickups: Pickup[]
  score: number
  distance: number      // meters
  speed: number         // px/s
  baseSpeed: number
  alive: boolean
  shielded: boolean
  shieldTimer: number
  boosted: boolean
  boostTimer: number
  flashTimer: number
  idCounter: number
  spawnTimer: number
  pickupTimer: number
  ticks: number
  startTime: number
  elapsed: number       // ms
}

// ─── Colors ───────────────────────────────────────────────────────────────────

const OBS_COLORS: Record<string, string> = {
  wall:  '#EF4444',
  spike: '#F97316',
  laser: '#A855F7',
}
const PICKUP_COLORS: Record<string, string> = {
  boost:  '#FBBF24',
  shield: '#3B82F6',
  score:  '#10B981',
}

const LANE_X = (lane: LaneIndex) => lane * LANE_W + LANE_W / 2

// ─── Initial State ────────────────────────────────────────────────────────────

function makeRunner(): RunnerState {
  return {
    lane: 1, targetLane: 1, laneOffset: 1,
    y: CH - PLAYER_H - 20,
    obstacles: [], pickups: [],
    score: 0, distance: 0,
    speed: 220, baseSpeed: 220,
    alive: true,
    shielded: false, shieldTimer: 0,
    boosted: false, boostTimer: 0,
    flashTimer: 0,
    idCounter: 0,
    spawnTimer: 0, pickupTimer: 0,
    ticks: 0,
    startTime: performance.now(),
    elapsed: 0,
  }
}

// ─── Update (pure) ────────────────────────────────────────────────────────────

function updateRunner(
  s: RunnerState,
  dt: number,
  inputLeft: boolean,
  inputRight: boolean,
): RunnerState {
  if (!s.alive) return s

  let ns = { ...s }
  ns.elapsed = performance.now() - ns.startTime
  ns.ticks++

  // Speed ramp: +10 px/s every 5s, cap at 600
  ns.speed = Math.min(600, ns.baseSpeed + Math.floor(ns.elapsed / 5000) * 10)
  const effectiveSpeed = ns.boosted ? ns.speed * 1.6 : ns.speed

  // Lane switch
  if (inputLeft  && ns.lane > 0 && ns.targetLane === ns.lane) ns.targetLane = (ns.lane - 1) as LaneIndex
  if (inputRight && ns.lane < 2 && ns.targetLane === ns.lane) ns.targetLane = (ns.lane + 1) as LaneIndex

  if (ns.targetLane !== ns.lane) {
    ns.laneOffset = Math.min(1, ns.laneOffset + dt * 6)
    if (ns.laneOffset >= 1) {
      ns.lane = ns.targetLane
      ns.laneOffset = 1
    }
  }

  // Timers
  if (ns.flashTimer > 0)   ns.flashTimer  = Math.max(0, ns.flashTimer  - dt)
  if (ns.shieldTimer > 0)  { ns.shieldTimer  = Math.max(0, ns.shieldTimer  - dt); if (ns.shieldTimer === 0) ns.shielded = false }
  if (ns.boostTimer > 0)   { ns.boostTimer   = Math.max(0, ns.boostTimer   - dt); if (ns.boostTimer === 0)  ns.boosted  = false }

  // Spawn obstacles
  ns.spawnTimer -= dt
  if (ns.spawnTimer <= 0) {
    const spawnInterval = Math.max(0.4, 1.1 - ns.elapsed / 30000)
    ns.spawnTimer = spawnInterval
    const types: Obstacle['type'][] = ['wall', 'wall', 'spike', 'laser']
    const type = types[Math.floor(Math.random() * types.length)]
    // Don't spawn all 3 lanes at once
    const count = Math.random() < 0.3 ? 2 : 1
    const lanes = ([0, 1, 2] as LaneIndex[]).sort(() => Math.random() - 0.5).slice(0, count)
    for (const lane of lanes) {
      ns.obstacles.push({ id: ns.idCounter++, lane, y: -OBSTACLE_H, type, color: OBS_COLORS[type] })
    }
  }

  // Spawn pickups
  ns.pickupTimer -= dt
  if (ns.pickupTimer <= 0) {
    ns.pickupTimer = 2.5 + Math.random() * 2
    const types: Pickup['type'][] = ['score', 'score', 'boost', 'shield']
    const type = types[Math.floor(Math.random() * types.length)]
    const lane = Math.floor(Math.random() * 3) as LaneIndex
    ns.pickups.push({ id: ns.idCounter++, lane, y: -PICKUP_R * 2, type, color: PICKUP_COLORS[type] })
  }

  // Move obstacles
  ns.obstacles = ns.obstacles
    .map(o => ({ ...o, y: o.y + effectiveSpeed * dt }))
    .filter(o => o.y < CH + OBSTACLE_H)

  // Move pickups
  ns.pickups = ns.pickups
    .map(p => ({ ...p, y: p.y + effectiveSpeed * dt }))
    .filter(p => p.y < CH + PICKUP_R * 2)

  // Player current X (lerped)
  const currentX = LANE_X(ns.lane) + (LANE_X(ns.targetLane) - LANE_X(ns.lane)) * (ns.targetLane !== ns.lane ? ns.laneOffset : 1)
  const playerRect = {
    x: currentX - PLAYER_W / 2 + 4,
    y: ns.y + 4,
    w: PLAYER_W - 8,
    h: PLAYER_H - 8,
  }

  // Collision with obstacles
  for (const obs of ns.obstacles) {
    if (obs.lane !== ns.lane && obs.lane !== ns.targetLane) continue
    const obsRect = {
      x: LANE_X(obs.lane) - OBSTACLE_W / 2,
      y: obs.y,
      w: OBSTACLE_W,
      h: OBSTACLE_H,
    }
    if (aabb(playerRect, obsRect)) {
      if (ns.shielded) {
        ns.shielded = false
        ns.shieldTimer = 0
        ns.flashTimer = 0.3
        ns.obstacles = ns.obstacles.filter(o => o.id !== obs.id)
      } else {
        ns.alive = false
        return ns
      }
    }
  }

  // Collect pickups
  const remaining: Pickup[] = []
  for (const pick of ns.pickups) {
    const pickRect = {
      x: LANE_X(pick.lane) - PICKUP_R,
      y: pick.y - PICKUP_R,
      w: PICKUP_R * 2,
      h: PICKUP_R * 2,
    }
    if (aabb(playerRect, pickRect)) {
      if (pick.type === 'score')  ns.score += 50 + Math.floor(ns.elapsed / 1000) * 2
      if (pick.type === 'boost')  { ns.boosted = true; ns.boostTimer = 3 }
      if (pick.type === 'shield') { ns.shielded = true; ns.shieldTimer = 5 }
    } else {
      remaining.push(pick)
    }
  }
  ns.pickups = remaining

  // Score from distance
  ns.distance += effectiveSpeed * dt / 60
  ns.score = Math.floor(ns.distance * 10 + ns.ticks * 0.5)

  return ns
}

function aabb(a: { x: number; y: number; w: number; h: number }, b: typeof a) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
}

// ─── Renderer ─────────────────────────────────────────────────────────────────

function drawRunner(ctx: CanvasRenderingContext2D, s: RunnerState, t: number) {
  const { width, height } = ctx.canvas
  ctx.clearRect(0, 0, width, height)

  // Background
  const bg = ctx.createLinearGradient(0, 0, 0, height)
  bg.addColorStop(0, '#000510')
  bg.addColorStop(1, '#080C20')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, width, height)

  // Grid lines (perspective illusion)
  ctx.strokeStyle = '#0D2040'
  ctx.lineWidth = 1
  for (let i = 0; i <= LANES; i++) {
    ctx.beginPath()
    ctx.moveTo(i * LANE_W, 0)
    ctx.lineTo(i * LANE_W, height)
    ctx.stroke()
  }

  // Scrolling lane markings
  const scrollY = (t * 300) % 60
  ctx.strokeStyle = '#0A1A30'
  ctx.lineWidth = 1
  ctx.setLineDash([20, 40])
  for (let lane = 0; lane < LANES - 1; lane++) {
    ctx.beginPath()
    ctx.moveTo((lane + 1) * LANE_W, -scrollY)
    ctx.lineTo((lane + 1) * LANE_W, height - scrollY + 60)
    ctx.stroke()
  }
  ctx.setLineDash([])

  // Distance markers
  const markerY = (t * 200) % 80
  for (let y = markerY; y < height; y += 80) {
    ctx.fillStyle = '#0A1A30'
    ctx.fillRect(0, y, width, 1)
  }

  // Obstacles
  for (const obs of s.obstacles) {
    const ox = LANE_X(obs.lane) - OBSTACLE_W / 2
    ctx.shadowBlur = 16
    ctx.shadowColor = obs.color + '80'
    const r = ctx.createLinearGradient(ox, obs.y, ox, obs.y + OBSTACLE_H)
    r.addColorStop(0, obs.color)
    r.addColorStop(1, obs.color + '40')
    ctx.fillStyle = r
    ctx.beginPath()
    roundRect(ctx, ox, obs.y, OBSTACLE_W, OBSTACLE_H, 4)
    ctx.fill()
    ctx.shadowBlur = 0
    // Label
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 11px monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(obs.type.toUpperCase(), LANE_X(obs.lane), obs.y + OBSTACLE_H / 2)
  }

  // Pickups
  for (const pick of s.pickups) {
    const px = LANE_X(pick.lane)
    ctx.shadowBlur = 20
    ctx.shadowColor = pick.color
    ctx.beginPath()
    ctx.arc(px, pick.y, PICKUP_R, 0, Math.PI * 2)
    ctx.fillStyle = pick.color + '30'
    ctx.fill()
    ctx.strokeStyle = pick.color
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.shadowBlur = 0
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 9px monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const label = pick.type === 'score' ? '+50' : pick.type === 'boost' ? 'BST' : 'SHD'
    ctx.fillText(label, px, pick.y)
  }

  // Player
  const currentX = LANE_X(s.lane) + (LANE_X(s.targetLane) - LANE_X(s.lane)) * (s.targetLane !== s.lane ? s.laneOffset : 1)
  const px = currentX - PLAYER_W / 2
  const py = s.y

  // Shield ring
  if (s.shielded) {
    const shieldPulse = 0.7 + 0.3 * Math.sin(t * 8)
    ctx.beginPath()
    ctx.arc(currentX, py + PLAYER_H / 2, PLAYER_W * 0.9, 0, Math.PI * 2)
    ctx.strokeStyle = `rgba(59,130,246,${shieldPulse})`
    ctx.lineWidth = 3
    ctx.shadowBlur = 20
    ctx.shadowColor = '#3B82F6'
    ctx.stroke()
    ctx.shadowBlur = 0
  }

  // Boost trail
  if (s.boosted) {
    for (let i = 1; i <= 4; i++) {
      const alpha = (1 - i / 5) * 0.4
      ctx.beginPath()
      ctx.ellipse(currentX, py + PLAYER_H + i * 6, PLAYER_W * 0.3, 8, 0, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(251,191,36,${alpha})`
      ctx.fill()
    }
  }

  // Flash (hit)
  const flashAlpha = s.flashTimer > 0 ? 0.5 : 0
  ctx.shadowBlur = s.boosted ? 20 : 8
  ctx.shadowColor = s.boosted ? '#FBBF24' : '#00E5FF'

  const pg = ctx.createLinearGradient(px, py, px, py + PLAYER_H)
  if (flashAlpha > 0) {
    pg.addColorStop(0, '#FF0000')
    pg.addColorStop(1, '#FF000060')
  } else {
    pg.addColorStop(0, s.boosted ? '#FBBF24' : '#00E5FF')
    pg.addColorStop(1, s.boosted ? '#F59E0B' : '#0284C7')
  }
  ctx.fillStyle = pg
  ctx.beginPath()
  // Ship shape
  ctx.moveTo(currentX, py)
  ctx.lineTo(currentX - PLAYER_W / 2, py + PLAYER_H)
  ctx.lineTo(currentX - PLAYER_W * 0.2, py + PLAYER_H * 0.75)
  ctx.lineTo(currentX, py + PLAYER_H * 0.9)
  ctx.lineTo(currentX + PLAYER_W * 0.2, py + PLAYER_H * 0.75)
  ctx.lineTo(currentX + PLAYER_W / 2, py + PLAYER_H)
  ctx.closePath()
  ctx.fill()
  ctx.shadowBlur = 0

  // Engine glow
  const enginePulse = 0.6 + 0.4 * Math.sin(t * 15)
  const eg = ctx.createRadialGradient(currentX, py + PLAYER_H, 0, currentX, py + PLAYER_H, 16)
  eg.addColorStop(0, `rgba(0, 229, 255, ${enginePulse})`)
  eg.addColorStop(1, 'transparent')
  ctx.fillStyle = eg
  ctx.fillRect(currentX - 16, py + PLAYER_H - 4, 32, 20)

  // HUD
  ctx.fillStyle = 'rgba(0,0,0,0.5)'
  ctx.fillRect(0, 0, width, 44)

  ctx.fillStyle = '#00E5FF'
  ctx.font = 'bold 14px "JetBrains Mono", monospace'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText(`${Math.floor(s.score).toLocaleString()}`, 12, 22)

  ctx.fillStyle = '#64748B'
  ctx.font = '11px monospace'
  ctx.fillText(`${Math.floor(s.distance)}m`, 12, 36)

  ctx.textAlign = 'center'
  ctx.fillStyle = '#334155'
  ctx.fillText(`${Math.floor(s.elapsed / 1000)}s`, width / 2, 22)

  // Speed indicator
  ctx.textAlign = 'right'
  const speedPct = (s.speed - 220) / (600 - 220)
  ctx.fillStyle = `hsl(${120 - speedPct * 120}, 80%, 60%)`
  ctx.font = 'bold 11px monospace'
  ctx.fillText(`${Math.floor(s.speed)}px/s`, width - 10, 22)

  // Status badges
  let badgeX = width / 2 - 30
  if (s.shielded) {
    ctx.fillStyle = '#3B82F6'
    ctx.font = 'bold 10px monospace'
    ctx.textAlign = 'center'
    ctx.fillText(`SHD ${s.shieldTimer.toFixed(1)}s`, badgeX, 36)
    badgeX += 60
  }
  if (s.boosted) {
    ctx.fillStyle = '#FBBF24'
    ctx.font = 'bold 10px monospace'
    ctx.textAlign = 'center'
    ctx.fillText(`BST ${s.boostTimer.toFixed(1)}s`, badgeX, 36)
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

// ─── Component ────────────────────────────────────────────────────────────────

interface NeonRunnerProps {
  highScore?: number
  onScore?: (score: number) => void
  onMatchEnd?: (score: number) => void
}

export function NeonRunner({ highScore = 0, onScore, onMatchEnd }: NeonRunnerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stateRef  = useRef<RunnerState>(makeRunner())
  const animRef   = useRef<number>(0)
  const lastRef   = useRef<number>(0)
  const inputRef  = useRef({ left: false, right: false })
  const [displayScore, setDisplayScore] = useState(0)
  const [started, setStarted] = useState(false)
  const [dead, setDead]       = useState(false)
  const [finalScore, setFinalScore] = useState(0)
  const [bestScore, setBestScore] = useState(highScore)

  const loopRef = useRef<(ts: number) => void>(() => {})

  const loop = useCallback((ts: number) => {
    const dt = Math.min((ts - lastRef.current) / 1000, 0.05)
    lastRef.current = ts
    const input = inputRef.current
    const next = updateRunner(stateRef.current, dt, input.left, input.right)
    stateRef.current = next

    const canvas = canvasRef.current
    if (canvas) {
      const ctx = canvas.getContext('2d')
      if (ctx) drawRunner(ctx, next, ts / 1000)
    }

    setDisplayScore(next.score)
    onScore?.(next.score)

    if (!next.alive) {
      const s = next.score
      setTimeout(() => {
        setDead(true)
        setFinalScore(s)
        setBestScore(prev => Math.max(prev, s))
        onMatchEnd?.(s)
      }, 0)
      return
    }
    animRef.current = requestAnimationFrame(ts2 => loopRef.current(ts2))
  }, [onScore, onMatchEnd])

  useEffect(() => { loopRef.current = loop }, [loop])

  const start = useCallback(() => {
    stateRef.current = makeRunner()
    setDead(false)
    setStarted(true)
    lastRef.current = performance.now()
    animRef.current = requestAnimationFrame(loop)
  }, [loop])

  const restart = useCallback(() => {
    cancelAnimationFrame(animRef.current)
    start()
  }, [start])

  useEffect(() => {
    return () => cancelAnimationFrame(animRef.current)
  }, [])

  // Keyboard
  useEffect(() => {
    const kd = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft'  || e.key === 'a' || e.key === 'A') inputRef.current.left  = true
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') inputRef.current.right = true
      if (e.key === ' ' && !started) start()
    }
    const ku = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft'  || e.key === 'a' || e.key === 'A') inputRef.current.left  = false
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') inputRef.current.right = false
    }
    window.addEventListener('keydown', kd)
    window.addEventListener('keyup', ku)
    return () => { window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku) }
  }, [started, start])

  // Initial draw
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    drawRunner(ctx, stateRef.current, 0)
  }, [])

  return (
    <div className="flex flex-col items-center gap-3 select-none">
      {/* Score display */}
      <div className="flex items-center justify-between w-full max-w-[420px] px-1">
        <div className="flex items-center gap-2">
          <Zap size={14} className="text-cyan-400" />
          <span className="font-mono text-cyan-400 font-bold tabular-nums text-lg">{displayScore.toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-2">
          <Trophy size={14} className="text-yellow-400" />
          <span className="font-mono text-yellow-400 tabular-nums text-sm">{bestScore.toLocaleString()}</span>
        </div>
      </div>

      {/* Canvas */}
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={CW}
          height={CH}
          className="rounded-xl border border-[#0D1F3C]"
          style={{ width: 'min(420px, 100vw - 2rem)', height: 'auto' }}
        />

        {/* Start screen */}
        <AnimatePresence>
          {!started && !dead && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center rounded-xl bg-[#000510]/80 backdrop-blur-sm gap-6"
            >
              <div className="text-center">
                <div className="text-5xl font-display font-black text-transparent bg-clip-text bg-gradient-to-b from-cyan-400 to-blue-600 mb-2">
                  NEON RUNNER
                </div>
                <div className="text-[#64748B] text-sm font-mono">Dodge. Collect. Survive.</div>
              </div>
              <div className="text-center text-xs text-[#334155] font-mono space-y-1">
                <div>← → Arrow Keys / A D to change lanes</div>
                <div>Collect <span className="text-green-400">green</span> for score, <span className="text-blue-400">blue</span> for shield, <span className="text-yellow-400">yellow</span> for boost</div>
              </div>
              <button
                onClick={start}
                className="px-8 py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-display font-black text-lg rounded-xl transition-colors shadow-lg shadow-cyan-500/30"
              >
                START
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Death screen */}
        <AnimatePresence>
          {dead && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute inset-0 flex flex-col items-center justify-center rounded-xl bg-[#000510]/85 backdrop-blur-sm gap-4"
            >
              <div className="text-red-400 font-display font-black text-4xl">DESTROYED</div>
              <div className="text-center">
                <div className="text-white font-mono text-2xl tabular-nums font-bold">
                  {finalScore.toLocaleString()}
                </div>
                <div className="text-[#64748B] text-xs mt-1">
                  {finalScore > highScore ? '🔥 New best score!' : `Best: ${bestScore.toLocaleString()}`}
                </div>
              </div>
              <button
                onClick={restart}
                className="flex items-center gap-2 px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-display font-bold rounded-xl transition-colors"
              >
                <RotateCcw size={14} />
                TRY AGAIN
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Mobile controls */}
      <div className="flex items-center gap-4 md:hidden">
        <button
          className="w-16 h-16 rounded-xl bg-[#0F172A] border border-[#334155] flex items-center justify-center text-white text-2xl active:bg-[#1E293B] touch-none"
          onPointerDown={() => { inputRef.current.left = true }}
          onPointerUp={() => { inputRef.current.left = false }}
          onPointerCancel={() => { inputRef.current.left = false }}
        >
          ←
        </button>
        <div className="text-[#334155] text-xs font-mono text-center">
          SWIPE LANE<br/>TO DODGE
        </div>
        <button
          className="w-16 h-16 rounded-xl bg-[#0F172A] border border-[#334155] flex items-center justify-center text-white text-2xl active:bg-[#1E293B] touch-none"
          onPointerDown={() => { inputRef.current.right = true }}
          onPointerUp={() => { inputRef.current.right = false }}
          onPointerCancel={() => { inputRef.current.right = false }}
        >
          →
        </button>
      </div>

      {/* Keyboard hint for desktop */}
      <div className="hidden md:flex items-center gap-2 text-[#334155] text-xs font-mono">
        <span className="px-2 py-1 border border-[#1E293B] rounded">←</span>
        <span className="px-2 py-1 border border-[#1E293B] rounded">→</span>
        <span>or A / D to change lanes</span>
      </div>
    </div>
  )
}
