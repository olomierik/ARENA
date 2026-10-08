// ─────────────────────────────────────────────────────────────────────────────
// CHESS ENGINE — complete rules, no external dependencies
// ─────────────────────────────────────────────────────────────────────────────

export type Color = 'w' | 'b'
export type PieceType = 'K' | 'Q' | 'R' | 'B' | 'N' | 'P'
export interface Piece { type: PieceType; color: Color }
export type Square = string // e.g. "e4"
export type Board = (Piece | null)[][]  // [rank 0..7][file 0..7], rank 0 = rank 1

export interface Move {
  from: Square
  to: Square
  promotion?: PieceType
  // internal flags
  flags: MoveFlags
  captured?: Piece
  castling?: 'K' | 'Q'      // kingside / queenside
  enPassantCapture?: Square
}

export type MoveFlags = {
  enPassant?: boolean
  castling?: 'K' | 'Q'
  promotion?: boolean
  capture?: boolean
}

export interface GameState {
  board: Board
  turn: Color
  castlingRights: { w: { K: boolean; Q: boolean }; b: { K: boolean; Q: boolean } }
  enPassantTarget: Square | null   // the square the pawn passed through
  halfMoveClock: number
  fullMoveNumber: number
  history: Move[]
  status: GameStatus
  inCheck: boolean
}

export type GameStatus = 'playing' | 'check' | 'checkmate' | 'stalemate' | 'draw'

// ─── Coordinate helpers ───────────────────────────────────────────────────────

export function squareToCoords(sq: Square): [number, number] {
  const file = sq.charCodeAt(0) - 97  // a=0..h=7
  const rank = parseInt(sq[1], 10) - 1 // 1=0..8=7
  return [rank, file]
}

export function coordsToSquare(rank: number, file: number): Square {
  return String.fromCharCode(97 + file) + (rank + 1)
}

export function inBounds(rank: number, file: number): boolean {
  return rank >= 0 && rank <= 7 && file >= 0 && file <= 7
}

// ─── Board initialisation ─────────────────────────────────────────────────────

function emptyBoard(): Board {
  return Array.from({ length: 8 }, () => Array<Piece | null>(8).fill(null))
}

const BACK_RANK: PieceType[] = ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']

export function initialGameState(): GameState {
  const board = emptyBoard()
  for (let f = 0; f < 8; f++) {
    board[0][f] = { type: BACK_RANK[f], color: 'w' }
    board[1][f] = { type: 'P', color: 'w' }
    board[6][f] = { type: 'P', color: 'b' }
    board[7][f] = { type: BACK_RANK[f], color: 'b' }
  }
  return {
    board,
    turn: 'w',
    castlingRights: { w: { K: true, Q: true }, b: { K: true, Q: true } },
    enPassantTarget: null,
    halfMoveClock: 0,
    fullMoveNumber: 1,
    history: [],
    status: 'playing',
    inCheck: false,
  }
}

// ─── Piece at square ─────────────────────────────────────────────────────────

export function pieceAt(board: Board, sq: Square): Piece | null {
  const [r, f] = squareToCoords(sq)
  return board[r][f]
}

// ─── Raw (pseudo-legal) move generation ──────────────────────────────────────

function pawnMoves(state: GameState, sq: Square): Move[] {
  const [r, f] = squareToCoords(sq)
  const piece = state.board[r][f]!
  const dir = piece.color === 'w' ? 1 : -1
  const startRank = piece.color === 'w' ? 1 : 6
  const promoRank = piece.color === 'w' ? 7 : 0
  const moves: Move[] = []

  const addPawn = (tr: number, tf: number, flags: MoveFlags, captured?: Piece, epCapSq?: Square) => {
    if (!inBounds(tr, tf)) return
    const to = coordsToSquare(tr, tf)
    if (tr === promoRank) {
      for (const promo of ['Q', 'R', 'B', 'N'] as PieceType[]) {
        moves.push({ from: sq, to, flags: { ...flags, promotion: true }, promotion: promo, captured, enPassantCapture: epCapSq })
      }
    } else {
      moves.push({ from: sq, to, flags, captured, enPassantCapture: epCapSq })
    }
  }

  // one forward
  if (inBounds(r + dir, f) && !state.board[r + dir][f]) {
    addPawn(r + dir, f, {})
    // two forward from start
    if (r === startRank && !state.board[r + 2 * dir][f]) {
      addPawn(r + 2 * dir, f, {})
    }
  }

  // captures
  for (const df of [-1, 1]) {
    const tr = r + dir; const tf = f + df
    if (!inBounds(tr, tf)) continue
    const target = state.board[tr][tf]
    if (target && target.color !== piece.color) {
      addPawn(tr, tf, { capture: true }, target)
    }
    // en passant
    if (state.enPassantTarget) {
      const [er, ef] = squareToCoords(state.enPassantTarget)
      if (tr === er && tf === ef) {
        const capSq = coordsToSquare(r, ef)
        addPawn(tr, tf, { enPassant: true, capture: true }, state.board[r][ef] ?? undefined, capSq)
      }
    }
  }

  return moves
}

function slidingMoves(state: GameState, sq: Square, dirs: [number, number][]): Move[] {
  const [r, f] = squareToCoords(sq)
  const piece = state.board[r][f]!
  const moves: Move[] = []
  for (const [dr, df] of dirs) {
    let tr = r + dr; let tf = f + df
    while (inBounds(tr, tf)) {
      const target = state.board[tr][tf]
      if (target) {
        if (target.color !== piece.color) {
          moves.push({ from: sq, to: coordsToSquare(tr, tf), flags: { capture: true }, captured: target })
        }
        break
      }
      moves.push({ from: sq, to: coordsToSquare(tr, tf), flags: {} })
      tr += dr; tf += df
    }
  }
  return moves
}

function knightMoves(state: GameState, sq: Square): Move[] {
  const [r, f] = squareToCoords(sq)
  const piece = state.board[r][f]!
  const moves: Move[] = []
  for (const [dr, df] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]] as [number,number][]) {
    const tr = r + dr; const tf = f + df
    if (!inBounds(tr, tf)) continue
    const target = state.board[tr][tf]
    if (!target || target.color !== piece.color) {
      moves.push({ from: sq, to: coordsToSquare(tr, tf), flags: target ? { capture: true } : {}, captured: target ?? undefined })
    }
  }
  return moves
}

function kingMoves(state: GameState, sq: Square): Move[] {
  const [r, f] = squareToCoords(sq)
  const piece = state.board[r][f]!
  const moves: Move[] = []
  for (const [dr, df] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]] as [number,number][]) {
    const tr = r + dr; const tf = f + df
    if (!inBounds(tr, tf)) continue
    const target = state.board[tr][tf]
    if (!target || target.color !== piece.color) {
      moves.push({ from: sq, to: coordsToSquare(tr, tf), flags: target ? { capture: true } : {}, captured: target ?? undefined })
    }
  }
  // Castling
  const rights = state.castlingRights[piece.color]
  const backRank = piece.color === 'w' ? 0 : 7
  if (rights.K && !state.board[backRank][5] && !state.board[backRank][6]) {
    moves.push({ from: sq, to: coordsToSquare(backRank, 6), flags: { castling: 'K' }, castling: 'K' })
  }
  if (rights.Q && !state.board[backRank][3] && !state.board[backRank][2] && !state.board[backRank][1]) {
    moves.push({ from: sq, to: coordsToSquare(backRank, 2), flags: { castling: 'Q' }, castling: 'Q' })
  }
  return moves
}

function pseudoLegalMoves(state: GameState, sq: Square): Move[] {
  const piece = state.board[squareToCoords(sq)[0]][squareToCoords(sq)[1]]
  if (!piece) return []
  switch (piece.type) {
    case 'P': return pawnMoves(state, sq)
    case 'N': return knightMoves(state, sq)
    case 'B': return slidingMoves(state, sq, [[-1,-1],[-1,1],[1,-1],[1,1]])
    case 'R': return slidingMoves(state, sq, [[-1,0],[1,0],[0,-1],[0,1]])
    case 'Q': return slidingMoves(state, sq, [[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]])
    case 'K': return kingMoves(state, sq)
    default:  return []
  }
}

// ─── Apply / unapply move (immutable) ────────────────────────────────────────

export function applyMove(state: GameState, move: Move): GameState {
  const board = state.board.map(row => [...row])
  const [fr, ff] = squareToCoords(move.from)
  const [tr, tf] = squareToCoords(move.to)
  const piece = board[fr][ff]!

  // Move piece
  board[tr][tf] = move.promotion ? { type: move.promotion, color: piece.color } : piece
  board[fr][ff] = null

  // En passant capture
  if (move.flags.enPassant && move.enPassantCapture) {
    const [er, ef] = squareToCoords(move.enPassantCapture)
    board[er][ef] = null
  }

  // Castling rook
  if (move.castling) {
    const backRank = piece.color === 'w' ? 0 : 7
    if (move.castling === 'K') {
      board[backRank][5] = board[backRank][7]
      board[backRank][7] = null
    } else {
      board[backRank][3] = board[backRank][0]
      board[backRank][0] = null
    }
  }

  // Update castling rights
  const cr = {
    w: { ...state.castlingRights.w },
    b: { ...state.castlingRights.b },
  }
  if (piece.type === 'K') { cr[piece.color].K = false; cr[piece.color].Q = false }
  if (piece.type === 'R') {
    if (ff === 7) cr[piece.color].K = false
    if (ff === 0) cr[piece.color].Q = false
  }

  // En passant target
  let epTarget: Square | null = null
  if (piece.type === 'P' && Math.abs(tr - fr) === 2) {
    epTarget = coordsToSquare((fr + tr) / 2, ff)
  }

  const newState: GameState = {
    board,
    turn: state.turn === 'w' ? 'b' : 'w',
    castlingRights: cr,
    enPassantTarget: epTarget,
    halfMoveClock: (piece.type === 'P' || move.flags.capture) ? 0 : state.halfMoveClock + 1,
    fullMoveNumber: state.turn === 'b' ? state.fullMoveNumber + 1 : state.fullMoveNumber,
    history: [...state.history, move],
    status: 'playing',
    inCheck: false,
  }

  // Update status
  newState.inCheck = isInCheck(newState, newState.turn)
  const legal = allLegalMoves(newState)
  if (legal.length === 0) {
    newState.status = newState.inCheck ? 'checkmate' : 'stalemate'
  } else if (newState.inCheck) {
    newState.status = 'check'
  } else if (newState.halfMoveClock >= 100) {
    newState.status = 'draw'
  } else {
    newState.status = 'playing'
  }

  return newState
}

// ─── Check detection ──────────────────────────────────────────────────────────

export function isInCheck(state: GameState, color: Color): boolean {
  // Find king
  let kingSquare: Square | null = null
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const p = state.board[r][f]
      if (p && p.type === 'K' && p.color === color) {
        kingSquare = coordsToSquare(r, f)
      }
    }
  }
  if (!kingSquare) return false

  // Check if any enemy piece attacks kingSquare
  const opp = color === 'w' ? 'b' : 'w'
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const p = state.board[r][f]
      if (!p || p.color !== opp) continue
      const sq = coordsToSquare(r, f)
      const moves = pseudoLegalMoves(state, sq)
      if (moves.some(m => m.to === kingSquare)) return true
    }
  }
  return false
}

function isInCheckAfterMove(state: GameState, move: Move): boolean {
  const next = applyMoveRaw(state, move)
  return isInCheck(next, state.turn)
}

// Lightweight apply (no status computation) for legality checking
function applyMoveRaw(state: GameState, move: Move): GameState {
  const board = state.board.map(row => [...row])
  const [fr, ff] = squareToCoords(move.from)
  const [tr, tf] = squareToCoords(move.to)
  const piece = board[fr][ff]!
  board[tr][tf] = move.promotion ? { type: move.promotion, color: piece.color } : piece
  board[fr][ff] = null
  if (move.flags.enPassant && move.enPassantCapture) {
    const [er, ef] = squareToCoords(move.enPassantCapture)
    board[er][ef] = null
  }
  if (move.castling) {
    const back = piece.color === 'w' ? 0 : 7
    if (move.castling === 'K') { board[back][5] = board[back][7]; board[back][7] = null }
    else { board[back][3] = board[back][0]; board[back][0] = null }
  }
  return { ...state, board, turn: state.turn === 'w' ? 'b' : 'w' }
}

// Castling: king must not pass through check
function castlingLegal(state: GameState, move: Move): boolean {
  const [r] = squareToCoords(move.from)
  const passThrough = move.castling === 'K'
    ? [coordsToSquare(r, 5)]
    : [coordsToSquare(r, 3)]
  for (const sq of passThrough) {
    const midState = applyMoveRaw(state, { ...move, to: sq, castling: undefined, flags: {} })
    if (isInCheck(midState, state.turn)) return false
  }
  return true
}

// ─── Legal moves ──────────────────────────────────────────────────────────────

export function legalMovesFrom(state: GameState, sq: Square): Move[] {
  const piece = pieceAt(state.board, sq)
  if (!piece || piece.color !== state.turn) return []
  return pseudoLegalMoves(state, sq).filter(m => {
    if (m.castling && (isInCheck(state, state.turn) || !castlingLegal(state, m))) return false
    return !isInCheckAfterMove(state, m)
  })
}

export function allLegalMoves(state: GameState): Move[] {
  const moves: Move[] = []
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const p = state.board[r][f]
      if (p && p.color === state.turn) {
        moves.push(...legalMovesFrom(state, coordsToSquare(r, f)))
      }
    }
  }
  return moves
}
