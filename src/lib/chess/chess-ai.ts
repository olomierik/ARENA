// ─────────────────────────────────────────────────────────────────────────────
// CHESS AI — minimax with alpha-beta pruning + piece-square tables
// ─────────────────────────────────────────────────────────────────────────────

import { type GameState, type Move, allLegalMoves, applyMove } from './chess-engine'

// ─── Piece values ─────────────────────────────────────────────────────────────

const PIECE_VALUE: Record<string, number> = {
  P: 100, N: 320, B: 330, R: 500, Q: 900, K: 20000,
}

// ─── Piece-square tables (white perspective, rank 0 = rank 1) ────────────────

const PST: Record<string, number[]> = {
  P: [
     0,  0,  0,  0,  0,  0,  0,  0,
    50, 50, 50, 50, 50, 50, 50, 50,
    10, 10, 20, 30, 30, 20, 10, 10,
     5,  5, 10, 25, 25, 10,  5,  5,
     0,  0,  0, 20, 20,  0,  0,  0,
     5, -5,-10,  0,  0,-10, -5,  5,
     5, 10, 10,-20,-20, 10, 10,  5,
     0,  0,  0,  0,  0,  0,  0,  0,
  ],
  N: [
    -50,-40,-30,-30,-30,-30,-40,-50,
    -40,-20,  0,  0,  0,  0,-20,-40,
    -30,  0, 10, 15, 15, 10,  0,-30,
    -30,  5, 15, 20, 20, 15,  5,-30,
    -30,  0, 15, 20, 20, 15,  0,-30,
    -30,  5, 10, 15, 15, 10,  5,-30,
    -40,-20,  0,  5,  5,  0,-20,-40,
    -50,-40,-30,-30,-30,-30,-40,-50,
  ],
  B: [
    -20,-10,-10,-10,-10,-10,-10,-20,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -10,  0,  5, 10, 10,  5,  0,-10,
    -10,  5,  5, 10, 10,  5,  5,-10,
    -10,  0, 10, 10, 10, 10,  0,-10,
    -10, 10, 10, 10, 10, 10, 10,-10,
    -10,  5,  0,  0,  0,  0,  5,-10,
    -20,-10,-10,-10,-10,-10,-10,-20,
  ],
  R: [
     0,  0,  0,  0,  0,  0,  0,  0,
     5, 10, 10, 10, 10, 10, 10,  5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
     0,  0,  0,  5,  5,  0,  0,  0,
  ],
  Q: [
    -20,-10,-10, -5, -5,-10,-10,-20,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -10,  0,  5,  5,  5,  5,  0,-10,
     -5,  0,  5,  5,  5,  5,  0, -5,
      0,  0,  5,  5,  5,  5,  0, -5,
    -10,  5,  5,  5,  5,  5,  0,-10,
    -10,  0,  5,  0,  0,  0,  0,-10,
    -20,-10,-10, -5, -5,-10,-10,-20,
  ],
  K: [
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -20,-30,-30,-40,-40,-30,-30,-20,
    -10,-20,-20,-20,-20,-20,-20,-10,
     20, 20,  0,  0,  0,  0, 20, 20,
     20, 30, 10,  0,  0, 10, 30, 20,
  ],
}

// ─── Static evaluation ────────────────────────────────────────────────────────

export function evaluate(state: GameState): number {
  if (state.status === 'checkmate') {
    return state.turn === 'w' ? -99999 : 99999
  }
  if (state.status === 'stalemate' || state.status === 'draw') return 0

  let score = 0
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const p = state.board[r][f]
      if (!p) continue
      const pstIndex = p.color === 'w' ? (7 - r) * 8 + f : r * 8 + f
      const pstVal = (PST[p.type]?.[pstIndex] ?? 0)
      const val = PIECE_VALUE[p.type] + pstVal
      score += p.color === 'w' ? val : -val
    }
  }
  return score
}

// ─── Move ordering (captures first) ─────────────────────────────────────────

function orderMoves(moves: Move[]): Move[] {
  return [...moves].sort((a, b) => {
    const aCapVal = a.captured ? PIECE_VALUE[a.captured.type] : 0
    const bCapVal = b.captured ? PIECE_VALUE[b.captured.type] : 0
    return bCapVal - aCapVal
  })
}

// ─── Minimax with alpha-beta ──────────────────────────────────────────────────

function minimax(state: GameState, depth: number, alpha: number, beta: number, maximizing: boolean): number {
  if (depth === 0 || state.status === 'checkmate' || state.status === 'stalemate' || state.status === 'draw') {
    return evaluate(state)
  }

  const moves = orderMoves(allLegalMoves(state))
  if (moves.length === 0) return evaluate(state)

  if (maximizing) {
    let best = -Infinity
    for (const m of moves) {
      const next = applyMove(state, m)
      const val = minimax(next, depth - 1, alpha, beta, false)
      if (val > best) best = val
      if (best > alpha) alpha = best
      if (beta <= alpha) break
    }
    return best
  } else {
    let best = Infinity
    for (const m of moves) {
      const next = applyMove(state, m)
      const val = minimax(next, depth - 1, alpha, beta, true)
      if (val < best) best = val
      if (best < beta) beta = best
      if (beta <= alpha) break
    }
    return best
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function getBestMove(state: GameState, depth = 3): Move | null {
  const moves = orderMoves(allLegalMoves(state))
  if (moves.length === 0) return null

  const maximizing = state.turn === 'w'
  let bestMove: Move = moves[0]
  let bestVal = maximizing ? -Infinity : Infinity

  for (const m of moves) {
    const next = applyMove(state, m)
    const val = minimax(next, depth - 1, -Infinity, Infinity, !maximizing)
    if (maximizing ? val > bestVal : val < bestVal) {
      bestVal = val
      bestMove = m
    }
  }
  return bestMove
}

export function getRandomMove(state: GameState): Move | null {
  const moves = allLegalMoves(state)
  if (moves.length === 0) return null
  return moves[Math.floor(Math.random() * moves.length)]
}

export type AIDifficulty = 'easy' | 'medium' | 'hard'

export function getAIMove(state: GameState, difficulty: AIDifficulty): Move | null {
  switch (difficulty) {
    case 'easy':   return getRandomMove(state)
    case 'medium': return getBestMove(state, 2)
    case 'hard':   return getBestMove(state, 3)
  }
}
