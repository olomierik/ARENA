// ─────────────────────────────────────────────────────────────────────────────
// CHESS PAGE — fully playable chess with AI + online multiplayer
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  type GameState, type Square, type Move, type Color, type PieceType,
  initialGameState, legalMovesFrom, applyMove, pieceAt, squareToCoords, coordsToSquare,
} from '../../lib/chess/chess-engine'
import { getAIMove, type AIDifficulty } from '../../lib/chess/chess-ai'
import { ChessMultiplayer, type ConnectionStatus, type MultiplayerRole } from '../../lib/chess/chess-multiplayer'

// ─── Unicode pieces ───────────────────────────────────────────────────────────

const PIECE_UNICODE: Record<Color, Record<PieceType, string>> = {
  w: { K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙' },
  b: { K: '♚', Q: '♛', R: '♜', B: '♝', N: '♞', P: '♟' },
}

// ─── Board colors ─────────────────────────────────────────────────────────────

const LIGHT_SQ = '#e8d5b7'
const DARK_SQ  = '#b58863'
const HIGHLIGHT_SELECTED = 'rgba(106, 232, 151, 0.6)'
const HIGHLIGHT_MOVE     = 'rgba(106, 232, 151, 0.35)'
const HIGHLIGHT_CHECK    = 'rgba(255, 60, 60, 0.55)'
const HIGHLIGHT_LAST     = 'rgba(255, 213, 79, 0.45)'

// ─── Game mode ────────────────────────────────────────────────────────────────

type GameMode = 'menu' | 'vs-ai' | 'local-2p' | 'online'
type OnlinePhase = 'setup' | 'hosting' | 'joining' | 'lobby' | 'playing'

// ─── Component ───────────────────────────────────────────────────────────────

export function ChessPage() {
  const [mode, setMode] = useState<GameMode>('menu')
  const [gameState, setGameState] = useState<GameState>(initialGameState())
  const [selected, setSelected] = useState<Square | null>(null)
  const [legalDests, setLegalDests] = useState<Square[]>([])
  const [promoDialog, setPromoDialog] = useState<{ from: Square; to: Square } | null>(null)
  const [playerColor, setPlayerColor] = useState<Color>('w')
  const [aiDifficulty, setAiDifficulty] = useState<AIDifficulty>('medium')
  const [aiThinking, setAiThinking] = useState(false)
  const [flipped, setFlipped] = useState(false)

  // Online multiplayer
  const [onlinePhase, setOnlinePhase] = useState<OnlinePhase>('setup')
  const [mpRole, setMpRole] = useState<MultiplayerRole>(null)
  const [mpStatus, setMpStatus] = useState<ConnectionStatus>('idle')
  const [roomCode, setRoomCode] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [sdpOffer, setSdpOffer] = useState('')
  const [sdpAnswer, setSdpAnswer] = useState('')
  const [mpMode, setMpMode] = useState<'local' | 'webrtc'>('local')
  const [drawOffer, setDrawOffer] = useState(false)
  const [resigned, setResigned] = useState<Color | null>(null)
  const mpRef = useRef<ChessMultiplayer | null>(null)
  const aiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ─── Cleanup on unmount ────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      mpRef.current?.disconnect()
      if (aiTimerRef.current) clearTimeout(aiTimerRef.current)
    }
  }, [])

  // ─── AI move trigger ───────────────────────────────────────────────────────
  // Use a ref so the effect body is stable — avoids set-state-in-effect lint

  const aiStateRef = useRef({ gameState, mode, playerColor, aiDifficulty })
  useEffect(() => { aiStateRef.current = { gameState, mode, playerColor, aiDifficulty } })

  useEffect(() => {
    const { gameState: gs, mode: m, playerColor: pc } = aiStateRef.current
    if (m !== 'vs-ai') return
    if (gs.turn === pc) return
    if (gs.status === 'checkmate' || gs.status === 'stalemate' || gs.status === 'draw') return

    const id = setTimeout(() => {
      const { gameState: current, mode: cm, playerColor: cpc } = aiStateRef.current
      if (cm !== 'vs-ai' || current.turn === cpc) return
      const move = getAIMove(current, aiStateRef.current.aiDifficulty)
      if (move) {
        setGameState(s => applyMove(s, move))
        setAiThinking(false)
      }
    }, 300 + Math.random() * 400)

    aiTimerRef.current = id
    setAiThinking(true)
    return () => clearTimeout(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.turn, gameState.status])

  // ─── Execute move ──────────────────────────────────────────────────────────
  // Plain function — stable because it only calls setters (which are stable)

  function executeMove(move: Move) {
    setSelected(null)
    setLegalDests([])
    setGameState(s => applyMove(s, move))
    if (mpRef.current) mpRef.current.sendMove(move)
  }

  // ─── Select square ─────────────────────────────────────────────────────────

  const handleSquareClick = useCallback((sq: Square) => {
    if (promoDialog) return
    if (gameState.status === 'checkmate' || gameState.status === 'stalemate' || gameState.status === 'draw' || resigned) return

    // Online: only move on your turn
    if (mode === 'online' && mpRole && gameState.turn !== (mpRole === 'host' ? 'w' : 'b')) return
    // VS AI: only move as player color
    if (mode === 'vs-ai' && gameState.turn !== playerColor) return
    if (aiThinking) return

    const piece = pieceAt(gameState.board, sq)

    if (selected) {
      if (legalDests.includes(sq)) {
        const moves = legalMovesFrom(gameState, selected)
        const move = moves.find(m => m.to === sq)
        if (!move) { setSelected(null); setLegalDests([]); return }

        // Pawn promotion
        if (move.flags.promotion) {
          setPromoDialog({ from: selected, to: sq })
          return
        }

        executeMove(move)
        return
      }
      // Clicked own piece — re-select
      if (piece && piece.color === gameState.turn) {
        setSelected(sq)
        setLegalDests(legalMovesFrom(gameState, sq).map(m => m.to))
        return
      }
      setSelected(null)
      setLegalDests([])
      return
    }

    if (piece && piece.color === gameState.turn) {
      setSelected(sq)
      setLegalDests(legalMovesFrom(gameState, sq).map(m => m.to))
    }
  }, [selected, legalDests, gameState, promoDialog, mode, mpRole, playerColor, aiThinking])



  const handlePromotion = useCallback((piece: PieceType) => {
    if (!promoDialog) return
    const moves = legalMovesFrom(gameState, promoDialog.from)
    const move = moves.find(m => m.to === promoDialog.to && m.promotion === piece)
    if (move) executeMove(move)
    setPromoDialog(null)
  }, [promoDialog, gameState, executeMove])

  // ─── Online multiplayer setup ──────────────────────────────────────────────

  function initMP() {
    mpRef.current?.disconnect()
    mpRef.current = new ChessMultiplayer({
      onMessage(msg) {
        if (msg.type === 'move' && msg.move) {
          setGameState(s => applyMove(s, msg.move!))
        }
        if (msg.type === 'resign') setResigned(mpRole === 'host' ? 'b' : 'w')
        if (msg.type === 'offer-draw') setDrawOffer(true)
        if (msg.type === 'accept-draw') setGameState(s => ({ ...s, status: 'draw' }))
      },
      onStatusChange(s) {
        setMpStatus(s)
        if (s === 'connected') setOnlinePhase('playing')
      },
      onRoleAssigned(role, code) {
        setMpRole(role)
        setRoomCode(code)
      },
      onError(err) { console.error('MP error:', err) },
    })
  }

  function hostLocal() {
    initMP()
    mpRef.current?.hostLocalRoom()
    setOnlinePhase('hosting')
  }

  function joinLocal() {
    if (!joinCode.trim()) return
    initMP()
    mpRef.current?.joinLocalRoom(joinCode)
    setMpRole('guest')
    setFlipped(true)
    setOnlinePhase('playing')
    setMode('online')
  }

  async function hostWebRTC() {
    initMP()
    const offer = await mpRef.current?.createOffer() ?? ''
    setSdpOffer(offer)
    setOnlinePhase('hosting')
  }

  async function joinWebRTC() {
    if (!sdpOffer.trim()) return
    initMP()
    const answer = await mpRef.current?.acceptOffer(sdpOffer) ?? ''
    setSdpAnswer(answer)
    setMpRole('guest')
    setFlipped(true)
    setOnlinePhase('joining')
  }

  async function finalizeWebRTC() {
    await mpRef.current?.finalizeConnection(sdpAnswer)
    setOnlinePhase('playing')
    setMode('online')
  }

  function startOnlineGame() {
    setMode('online')
    setGameState(initialGameState())
    if (mpRole === 'guest') setFlipped(true)
  }

  // ─── Game controls ─────────────────────────────────────────────────────────

  function restart() {
    if (aiTimerRef.current) clearTimeout(aiTimerRef.current)
    setGameState(initialGameState())
    setSelected(null)
    setLegalDests([])
    setPromoDialog(null)
    setAiThinking(false)
    setResigned(null)
    setDrawOffer(false)
  }

  function backToMenu() {
    mpRef.current?.disconnect()
    restart()
    setMode('menu')
    setOnlinePhase('setup')
    setMpRole(null)
    setMpStatus('idle')
    setFlipped(false)
    setSdpOffer('')
    setSdpAnswer('')
    setJoinCode('')
  }

  // ─── Board rendering ───────────────────────────────────────────────────────

  const lastMove = gameState.history[gameState.history.length - 1]

  // Find king square for check highlight
  function getKingSquare(color: Color): Square | null {
    for (let r = 0; r < 8; r++)
      for (let f = 0; f < 8; f++) {
        const p = gameState.board[r][f]
        if (p?.type === 'K' && p.color === color) return coordsToSquare(r, f)
      }
    return null
  }

  function getSquareColor(sq: Square): string {
    const [r, f] = squareToCoords(sq)
    if (gameState.inCheck && sq === getKingSquare(gameState.turn)) return HIGHLIGHT_CHECK
    if (selected === sq) return HIGHLIGHT_SELECTED
    if (legalDests.includes(sq)) return HIGHLIGHT_MOVE
    if (lastMove && (lastMove.from === sq || lastMove.to === sq)) return HIGHLIGHT_LAST
    return (r + f) % 2 === 0 ? DARK_SQ : LIGHT_SQ
  }

  function renderBoard() {
    const ranks = flipped ? [0,1,2,3,4,5,6,7] : [7,6,5,4,3,2,1,0]
    const files = flipped ? [7,6,5,4,3,2,1,0] : [0,1,2,3,4,5,6,7]

    return (
      <div className="relative select-none" style={{ width: 'min(80vw, 80vh, 560px)', aspectRatio: '1' }}>
        {/* Board */}
        <div className="grid w-full h-full" style={{ gridTemplateColumns: 'repeat(8, 1fr)', gridTemplateRows: 'repeat(8, 1fr)' }}>
          {ranks.flatMap(r =>
            files.map(f => {
              const sq = coordsToSquare(r, f)
              const piece = gameState.board[r][f]
              const isDest = legalDests.includes(sq)
              const bg = getSquareColor(sq)
              return (
                <div
                  key={sq}
                  onClick={() => handleSquareClick(sq)}
                  style={{ backgroundColor: bg, cursor: 'pointer', position: 'relative' }}
                  className="flex items-center justify-center transition-colors duration-100"
                >
                  {/* Legal move dot / ring */}
                  {isDest && !piece && (
                    <div className="absolute w-[30%] h-[30%] rounded-full"
                      style={{ backgroundColor: 'rgba(0,0,0,0.18)', pointerEvents: 'none' }} />
                  )}
                  {isDest && piece && (
                    <div className="absolute inset-0 rounded-sm border-4"
                      style={{ borderColor: 'rgba(0,0,0,0.2)', pointerEvents: 'none' }} />
                  )}
                  {/* Piece */}
                  {piece && (
                    <span
                      className="text-[calc(min(10vw,10vh,70px)*0.75)] leading-none"
                      style={{
                        textShadow: piece.color === 'w'
                          ? '0 1px 2px rgba(0,0,0,0.6)'
                          : '0 1px 2px rgba(255,255,255,0.15)',
                        filter: selected === sq ? 'brightness(1.15)' : undefined,
                        zIndex: 2,
                        userSelect: 'none',
                      }}
                    >
                      {PIECE_UNICODE[piece.color][piece.type]}
                    </span>
                  )}
                  {/* Rank label (leftmost file) */}
                  {f === (flipped ? 7 : 0) && (
                    <span className="absolute top-0.5 left-1 text-[9px] font-bold opacity-60 leading-none"
                      style={{ color: (r + f) % 2 === 0 ? LIGHT_SQ : DARK_SQ }}>
                      {r + 1}
                    </span>
                  )}
                  {/* File label (bottom rank) */}
                  {r === (flipped ? 7 : 0) && (
                    <span className="absolute bottom-0.5 right-1 text-[9px] font-bold opacity-60 leading-none"
                      style={{ color: (r + f) % 2 === 0 ? LIGHT_SQ : DARK_SQ }}>
                      {String.fromCharCode(97 + f)}
                    </span>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    )
  }

  // ─── Status text ──────────────────────────────────────────────────────────

  function getStatusText(): { text: string; color: string } {
    if (resigned) return { text: `${resigned === 'w' ? 'White' : 'Black'} resigned — ${resigned === 'w' ? 'Black' : 'White'} wins!`, color: '#6AE897' }
    switch (gameState.status) {
      case 'checkmate': return { text: `Checkmate — ${gameState.turn === 'w' ? 'Black' : 'White'} wins!`, color: '#ff6b6b' }
      case 'stalemate': return { text: 'Stalemate — Draw!', color: '#ffd54f' }
      case 'draw':      return { text: 'Draw!', color: '#ffd54f' }
      case 'check':     return { text: `${gameState.turn === 'w' ? 'White' : 'Black'} is in Check!`, color: '#ff9800' }
      default:
        if (aiThinking) return { text: 'AI is thinking…', color: '#00e5ff' }
        return { text: `${gameState.turn === 'w' ? '♔ White' : '♚ Black'} to move`, color: '#a0aec0' }
    }
  }

  const gameOver = gameState.status === 'checkmate' || gameState.status === 'stalemate' || gameState.status === 'draw' || !!resigned

  // ─── Menu ──────────────────────────────────────────────────────────────────

  if (mode === 'menu') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
        style={{ background: 'var(--arena-void)' }}>
        <motion.div
          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-10">
            <div className="text-6xl mb-3">♟</div>
            <h1 className="text-4xl font-black tracking-tight text-white mb-2" style={{ fontFamily: 'var(--font-display)' }}>
              ARENA CHESS
            </h1>
            <p className="text-[var(--text-muted)] text-sm">Full rules · AI opponent · Online multiplayer</p>
          </div>

          <div className="space-y-3">
            {/* vs AI */}
            <div className="p-4 rounded-xl border border-[var(--arena-border)] bg-[var(--arena-glass)] backdrop-blur-sm">
              <h3 className="text-white font-bold mb-3 font-display">🤖 Play vs AI</h3>
              <div className="flex gap-2 mb-3">
                {(['white','black'] as const).map(c => (
                  <button key={c}
                    onClick={() => setPlayerColor(c === 'white' ? 'w' : 'b')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${playerColor === (c === 'white' ? 'w' : 'b') ? 'bg-[var(--neon-cyan)] text-black' : 'border border-[var(--arena-border)] text-[var(--text-muted)] hover:border-[var(--neon-cyan)]'}`}
                  >
                    {c === 'white' ? '♔ White' : '♚ Black'}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 mb-3">
                {(['easy','medium','hard'] as AIDifficulty[]).map(d => (
                  <button key={d}
                    onClick={() => setAiDifficulty(d)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${aiDifficulty === d ? 'bg-[var(--neon-purple)] text-white' : 'border border-[var(--arena-border)] text-[var(--text-muted)] hover:border-[var(--neon-purple)]'}`}
                  >
                    {d}
                  </button>
                ))}
              </div>
              <button
                onClick={() => { setFlipped(playerColor === 'b'); restart(); setMode('vs-ai') }}
                className="w-full py-2.5 rounded-xl font-black text-sm text-black"
                style={{ background: 'linear-gradient(135deg, var(--neon-cyan), var(--neon-green))' }}
              >
                ▶ START GAME
              </button>
            </div>

            {/* Local 2-player */}
            <button
              onClick={() => { setFlipped(false); restart(); setMode('local-2p') }}
              className="w-full p-4 rounded-xl border border-[var(--arena-border)] bg-[var(--arena-glass)] text-left hover:border-[var(--neon-cyan)] transition-all group"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">🎮</span>
                <div>
                  <div className="text-white font-bold group-hover:text-[var(--neon-cyan)] transition-colors font-display">Local 2 Players</div>
                  <div className="text-[var(--text-muted)] text-xs">Pass and play on same device</div>
                </div>
              </div>
            </button>

            {/* Online */}
            <button
              onClick={() => setMode('online')}
              className="w-full p-4 rounded-xl border border-[var(--arena-border)] bg-[var(--arena-glass)] text-left hover:border-[var(--neon-purple)] transition-all group"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">🌐</span>
                <div>
                  <div className="text-white font-bold group-hover:text-[var(--neon-purple)] transition-colors font-display">Online Multiplayer</div>
                  <div className="text-[var(--text-muted)] text-xs">Same-device tab · WebRTC cross-device</div>
                </div>
              </div>
            </button>
          </div>
        </motion.div>
      </div>
    )
  }

  // ─── Online lobby ──────────────────────────────────────────────────────────

  if (mode === 'online' && onlinePhase !== 'playing') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
        style={{ background: 'var(--arena-void)' }}>
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="text-4xl mb-2">🌐</div>
            <h2 className="text-2xl font-black text-white font-display">ONLINE PLAY</h2>
            <p className="text-[var(--text-muted)] text-xs mt-1">No servers needed — peer-to-peer</p>
          </div>

          {onlinePhase === 'setup' && (
            <div className="space-y-4">
              {/* Mode selector */}
              <div className="flex gap-2 mb-4">
                <button onClick={() => setMpMode('local')}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${mpMode === 'local' ? 'bg-[var(--neon-cyan)] text-black' : 'border border-[var(--arena-border)] text-[var(--text-muted)]'}`}>
                  Same Device / Browser
                </button>
                <button onClick={() => setMpMode('webrtc')}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${mpMode === 'webrtc' ? 'bg-[var(--neon-purple)] text-white' : 'border border-[var(--arena-border)] text-[var(--text-muted)]'}`}>
                  Cross-Device (WebRTC)
                </button>
              </div>

              {mpMode === 'local' && (
                <div className="p-4 rounded-xl border border-[var(--arena-border)] bg-[var(--arena-glass)] space-y-3">
                  <p className="text-[var(--text-muted)] text-xs">Open this app in two browser tabs. Host in one tab, join with the code in the other.</p>
                  <button onClick={hostLocal}
                    className="w-full py-2.5 rounded-xl font-black text-sm text-black"
                    style={{ background: 'linear-gradient(135deg, var(--neon-cyan), var(--neon-green))' }}>
                    🏠 HOST — Create Room
                  </button>
                  <div className="flex gap-2">
                    <input value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())}
                      placeholder="ROOM CODE" maxLength={6}
                      className="flex-1 px-3 py-2 rounded-lg bg-[var(--arena-void)] border border-[var(--arena-border)] text-white text-sm font-mono tracking-widest placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--neon-purple)]" />
                    <button onClick={joinLocal}
                      className="px-4 py-2 rounded-lg font-bold text-white text-sm"
                      style={{ background: 'var(--neon-purple)' }}>
                      JOIN
                    </button>
                  </div>
                </div>
              )}

              {mpMode === 'webrtc' && (
                <div className="p-4 rounded-xl border border-[var(--arena-border)] bg-[var(--arena-glass)] space-y-3">
                  <p className="text-[var(--text-muted)] text-xs">Exchange connection codes manually to connect across devices.</p>
                  <button onClick={() => { void hostWebRTC() }}
                    className="w-full py-2.5 rounded-xl font-black text-sm text-black"
                    style={{ background: 'linear-gradient(135deg, var(--neon-cyan), var(--neon-green))' }}>
                    🏠 HOST — Generate Offer
                  </button>
                  <div>
                    <label className="text-[var(--text-muted)] text-xs block mb-1">Paste opponent's OFFER code here, then click JOIN:</label>
                    <textarea value={sdpOffer} onChange={e => setSdpOffer(e.target.value)}
                      rows={3} placeholder="Paste offer code..."
                      className="w-full px-3 py-2 rounded-lg bg-[var(--arena-void)] border border-[var(--arena-border)] text-white text-xs font-mono resize-none focus:outline-none focus:border-[var(--neon-purple)]" />
                    <button onClick={() => { void joinWebRTC() }}
                      className="mt-2 w-full py-2 rounded-lg font-bold text-white text-sm"
                      style={{ background: 'var(--neon-purple)' }}>
                      🔗 JOIN WITH OFFER
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {onlinePhase === 'hosting' && (
            <div className="p-6 rounded-xl border border-[var(--arena-border)] bg-[var(--arena-glass)] text-center space-y-4">
              <div className="text-[var(--text-muted)] text-sm">Your room code:</div>
              <div className="text-5xl font-black font-mono text-[var(--neon-cyan)] tracking-widest">{roomCode}</div>
              {mpMode === 'local' && <p className="text-[var(--text-muted)] text-xs">Share this code with your opponent in another tab</p>}
              {mpMode === 'webrtc' && sdpOffer && (
                <div>
                  <p className="text-[var(--text-muted)] text-xs mb-2">Share this OFFER code with your opponent:</p>
                  <textarea readOnly value={sdpOffer} rows={3}
                    className="w-full px-3 py-2 rounded-lg bg-[var(--arena-void)] border border-[var(--arena-border)] text-white text-xs font-mono resize-none" />
                  <label className="text-[var(--text-muted)] text-xs block mt-3 mb-1">Paste opponent's ANSWER code:</label>
                  <textarea value={sdpAnswer} onChange={e => setSdpAnswer(e.target.value)} rows={3}
                    className="w-full px-3 py-2 rounded-lg bg-[var(--arena-void)] border border-[var(--arena-border)] text-white text-xs font-mono resize-none focus:outline-none focus:border-[var(--neon-purple)]" />
                  <button onClick={() => { void finalizeWebRTC() }}
                    className="mt-2 w-full py-2 rounded-lg font-bold text-black text-sm"
                    style={{ background: 'var(--neon-cyan)' }}>
                    ✓ CONNECT
                  </button>
                </div>
              )}
              <div className="flex items-center justify-center gap-2 text-[var(--text-muted)] text-xs">
                <div className={`w-2 h-2 rounded-full ${mpStatus === 'connected' ? 'bg-green-400' : 'bg-yellow-400 animate-pulse'}`} />
                {mpStatus === 'connected' ? 'Connected!' : 'Waiting for opponent…'}
              </div>
              {mpStatus === 'connected' && (
                <button onClick={startOnlineGame}
                  className="w-full py-2.5 rounded-xl font-black text-sm text-black"
                  style={{ background: 'linear-gradient(135deg, var(--neon-cyan), var(--neon-green))' }}>
                  ▶ START GAME
                </button>
              )}
            </div>
          )}

          {onlinePhase === 'joining' && sdpAnswer && (
            <div className="p-6 rounded-xl border border-[var(--arena-border)] bg-[var(--arena-glass)] text-center space-y-4">
              <p className="text-[var(--text-muted)] text-xs">Copy this ANSWER code and paste it to your opponent:</p>
              <textarea readOnly value={sdpAnswer} rows={3}
                className="w-full px-3 py-2 rounded-lg bg-[var(--arena-void)] border border-[var(--arena-border)] text-white text-xs font-mono resize-none" />
              <div className="flex items-center justify-center gap-2 text-[var(--text-muted)] text-xs">
                <div className={`w-2 h-2 rounded-full ${mpStatus === 'connected' ? 'bg-green-400' : 'bg-yellow-400 animate-pulse'}`} />
                {mpStatus === 'connected' ? 'Connected!' : 'Waiting for host to finalize…'}
              </div>
              {mpStatus === 'connected' && (
                <button onClick={startOnlineGame}
                  className="w-full py-2.5 rounded-xl font-black text-sm text-black"
                  style={{ background: 'linear-gradient(135deg, var(--neon-cyan), var(--neon-green))' }}>
                  ▶ START GAME
                </button>
              )}
            </div>
          )}

          <button onClick={() => { setMode('menu'); setOnlinePhase('setup') }}
            className="mt-4 w-full py-2 rounded-lg border border-[var(--arena-border)] text-[var(--text-muted)] text-sm hover:border-[var(--neon-cyan)] hover:text-white transition-all">
            ← Back to Menu
          </button>
        </motion.div>
      </div>
    )
  }

  // ─── Main game view ────────────────────────────────────────────────────────

  const { text: statusText, color: statusColor } = getStatusText()

  return (
    <div className="min-h-screen flex flex-col items-center py-4 px-2" style={{ background: 'var(--arena-void)' }}>

      {/* Header */}
      <div className="flex items-center justify-between w-full max-w-2xl mb-3 px-2">
        <button onClick={backToMenu}
          className="text-[var(--text-muted)] hover:text-white text-sm transition-colors flex items-center gap-1">
          ← Menu
        </button>
        <div className="flex items-center gap-2">
          <span className="text-white font-black font-display text-lg tracking-wider">♟ ARENA CHESS</span>
          {mode === 'online' && (
            <span className="text-xs px-2 py-0.5 rounded-full font-bold"
              style={{ background: mpStatus === 'connected' ? 'var(--neon-green)' : '#666', color: 'black' }}>
              {mpStatus === 'connected' ? 'ONLINE' : 'CONNECTING'}
            </span>
          )}
        </div>
        <button onClick={() => setFlipped(f => !f)}
          className="text-[var(--text-muted)] hover:text-white text-sm transition-colors">
          ↕ Flip
        </button>
      </div>

      {/* Status bar */}
      <div className="mb-3 px-4 py-1.5 rounded-full text-sm font-bold"
        style={{ background: 'var(--arena-glass)', border: '1px solid var(--arena-border)', color: statusColor }}>
        {statusText}
      </div>

      {/* Captured pieces / material row (black on top when white perspective) */}
      <div className="flex w-full max-w-xl justify-between px-2 mb-1 text-lg opacity-70">
        <span>{flipped ? '♔ White' : '♚ Black'}</span>
        <span className="text-xs text-[var(--text-muted)] self-center">
          {mode === 'vs-ai' ? `AI (${aiDifficulty})` : mode === 'online' ? `Online · ${mpRole ?? ''}` : 'Local 2P'}
        </span>
      </div>

      {/* Board */}
      <div className="rounded-md overflow-hidden shadow-2xl" style={{ boxShadow: '0 0 40px rgba(0,229,255,0.07)' }}>
        {renderBoard()}
      </div>

      <div className="flex w-full max-w-xl justify-between px-2 mt-1 mb-3 text-lg opacity-70">
        <span>{flipped ? '♚ Black' : '♔ White'}</span>
        <span className="text-xs text-[var(--text-muted)] self-center">
          Move {gameState.fullMoveNumber} · Half-clock {gameState.halfMoveClock}
        </span>
      </div>

      {/* Controls */}
      <div className="flex gap-2 flex-wrap justify-center mt-1">
        <button onClick={restart}
          className="px-4 py-2 rounded-xl text-sm font-bold border border-[var(--arena-border)] text-[var(--text-muted)] hover:border-[var(--neon-cyan)] hover:text-white transition-all">
          ↺ New Game
        </button>
        {mode === 'online' && !gameOver && (
          <>
            <button onClick={() => { mpRef.current?.sendResign(); setResigned(mpRole === 'host' ? 'w' : 'b') }}
              className="px-4 py-2 rounded-xl text-sm font-bold border border-red-500/40 text-red-400 hover:bg-red-500/10 transition-all">
              ⚑ Resign
            </button>
            <button onClick={() => mpRef.current?.sendOfferDraw()}
              className="px-4 py-2 rounded-xl text-sm font-bold border border-[var(--arena-border)] text-[var(--text-muted)] hover:border-yellow-400 hover:text-yellow-400 transition-all">
              ½ Offer Draw
            </button>
          </>
        )}
      </div>

      {/* Draw offer received */}
      <AnimatePresence>
        {drawOffer && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="mt-3 px-5 py-3 rounded-xl border border-yellow-400/50 bg-yellow-400/10 text-center">
            <p className="text-white text-sm font-bold mb-2">Opponent offers a draw</p>
            <div className="flex gap-2 justify-center">
              <button onClick={() => { mpRef.current?.sendAcceptDraw(); setGameState(s => ({ ...s, status: 'draw' })); setDrawOffer(false) }}
                className="px-4 py-1.5 rounded-lg bg-yellow-400 text-black font-bold text-xs">Accept</button>
              <button onClick={() => setDrawOffer(false)}
                className="px-4 py-1.5 rounded-lg border border-[var(--arena-border)] text-[var(--text-muted)] text-xs">Decline</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Move history */}
      {gameState.history.length > 0 && (
        <div className="mt-4 w-full max-w-xl">
          <div className="text-[var(--text-muted)] text-xs mb-1 px-1">Move history</div>
          <div className="bg-[var(--arena-glass)] border border-[var(--arena-border)] rounded-xl px-3 py-2 max-h-24 overflow-y-auto">
            <div className="flex flex-wrap gap-1">
              {Array.from({ length: Math.ceil(gameState.history.length / 2) }).map((_, i) => {
                const w = gameState.history[i * 2]
                const b = gameState.history[i * 2 + 1]
                return (
                  <span key={i} className="text-xs font-mono text-[var(--text-muted)]">
                    <span className="text-white/40 mr-0.5">{i + 1}.</span>
                    <span className="text-white mr-1">{w.from}{w.to}{w.promotion ? `=${w.promotion}` : ''}</span>
                    {b && <span className="text-white/70">{b.from}{b.to}{b.promotion ? `=${b.promotion}` : ''}</span>}
                  </span>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Promotion dialog */}
      <AnimatePresence>
        {promoDialog && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }}
              className="bg-[#1a1a2e] border border-[var(--arena-border)] rounded-2xl p-6 text-center shadow-2xl">
              <h3 className="text-white font-black text-lg mb-4 font-display">PROMOTE PAWN</h3>
              <div className="flex gap-3">
                {(['Q', 'R', 'B', 'N'] as PieceType[]).map(p => (
                  <button key={p} onClick={() => handlePromotion(p)}
                    className="w-16 h-16 rounded-xl border-2 border-[var(--arena-border)] hover:border-[var(--neon-cyan)] bg-[var(--arena-glass)] text-4xl flex items-center justify-center transition-all hover:scale-110">
                    {PIECE_UNICODE[gameState.turn][p]}
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
