// ─── AGENT ARENA — Central Store ──────────────────────────────────────────────
import {
  Player, Tournament, MatchRecord, StakePosition, ActivityEvent, Achievement,
  getRank, getLevel, xpForWin, BracketMatch
} from './types'

const STORAGE_KEY = 'arena_v4'

interface ArenaState {
  currentPlayer: Player | null
  players: Player[]
  matches: MatchRecord[]
  tournaments: Tournament[]
  stakes: StakePosition[]
  activity: ActivityEvent[]
  achievements: Achievement[]
  arenaBalance: number      // $ARENA token balance (testnet)
  usdcBalance: number       // testnet USDC
}

function nanoid(): string {
  return Math.random().toString(36).slice(2, 10)
}

function seedPlayer(overrides: Partial<Player> & { id: string; name: string }): Player {
  const xp = overrides.xp ?? 0
  return {
    avatarSeed: overrides.id,
    wins: 0, losses: 0, draws: 0, totalScore: 0,
    level: getLevel(xp), rank: getRank(xp), streak: 0,
    hexWins: 0, runnerBest: 0, stakedArena: 0, tournamentWins: 0,
    joinedAt: Date.now() - Math.random() * 30 * 86400000,
    ...overrides,
    xp,
  }
}

const SEED_PLAYERS: Player[] = [
  seedPlayer({ id: 'alpha',  name: 'AlphaNode',   xp: 4200, wins: 87,  losses: 22, streak: 5,  hexWins: 61, runnerBest: 18400 }),
  seedPlayer({ id: 'oracle', name: 'OracleX',     xp: 3100, wins: 64,  losses: 31, streak: 3,  hexWins: 40, runnerBest: 15200 }),
  seedPlayer({ id: 'titan',  name: 'TitanCore',   xp: 2600, wins: 55,  losses: 28, streak: 0,  hexWins: 33, runnerBest: 12800 }),
  seedPlayer({ id: 'nova',   name: 'NovaStrike',  xp: 1900, wins: 41,  losses: 35, streak: 2,  hexWins: 22, runnerBest: 9600  }),
  seedPlayer({ id: 'dragon', name: 'DragonSlayer',xp: 1200, wins: 28,  losses: 40, streak: 0,  hexWins: 15, runnerBest: 7100  }),
]

function makeDefaultState(): ArenaState {
  const now = Date.now()
  const t1: Tournament = {
    id: 't1', name: 'HEX WARS OPEN', game: 'hex-wars',
    entryFee: 0, prizePool: 500, maxPlayers: 8,
    players: ['alpha', 'oracle', 'titan', 'nova'],
    status: 'open', winner: null,
    createdAt: now - 3600000, startsAt: now + 7200000, completedAt: null,
    bracket: [],
  }
  const t2: Tournament = {
    id: 't2', name: 'NEON RUNNER SPRINT', game: 'neon-runner',
    entryFee: 100, prizePool: 800, maxPlayers: 8,
    players: ['dragon', 'alpha', 'titan'],
    status: 'open', winner: null,
    createdAt: now - 7200000, startsAt: now + 3600000, completedAt: null,
    bracket: [],
  }
  const t3: Tournament = {
    id: 't3', name: 'DIAMOND LEAGUE — HEX', game: 'hex-wars',
    entryFee: 250, prizePool: 2000, maxPlayers: 4,
    players: ['alpha', 'oracle'],
    status: 'open', winner: null,
    createdAt: now - 1800000, startsAt: now + 14400000, completedAt: null,
    bracket: [],
  }

  const activity: ActivityEvent[] = [
    { id: 'a1', type: 'match',       icon: 'swords',  message: 'AlphaNode defeated OracleX in Hex Wars — 7:3',    timestamp: now - 80000 },
    { id: 'a2', type: 'tournament',  icon: 'trophy',  message: 'NEON RUNNER SPRINT opened — 5 spots left',         timestamp: now - 140000 },
    { id: 'a3', type: 'stake',       icon: 'coins',   message: 'TitanCore staked 500 $ARENA on Hex Wars Open',      timestamp: now - 210000 },
    { id: 'a4', type: 'match',       icon: 'swords',  message: 'DragonSlayer scored 18,400 in Neon Runner',         timestamp: now - 310000 },
    { id: 'a5', type: 'level_up',    icon: 'star',    message: 'NovaStrike reached Gold rank',                      timestamp: now - 420000 },
    { id: 'a6', type: 'match',       icon: 'swords',  message: 'OracleX defeated TitanCore in Hex Wars — 6:4',     timestamp: now - 540000 },
    { id: 'a7', type: 'tournament',  icon: 'trophy',  message: 'DIAMOND LEAGUE filled — bracket locked',            timestamp: now - 680000 },
    { id: 'a8', type: 'stake',       icon: 'coins',   message: 'AlphaNode staked 1,200 $ARENA',                     timestamp: now - 820000 },
  ]

  return {
    currentPlayer: null,
    players: SEED_PLAYERS,
    matches: [],
    tournaments: [t1, t2, t3],
    stakes: [],
    activity,
    achievements: [],
    arenaBalance: 1000,
    usdcBalance: 50,
  }
}

// ─── Persistence ──────────────────────────────────────────────────────────────

function load(): ArenaState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...makeDefaultState(), ...(JSON.parse(raw) as Partial<ArenaState>) }
  } catch { /* ignore */ }
  return makeDefaultState()
}

let _state: ArenaState = load()
const _listeners: Set<() => void> = new Set()

function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(_state)) } catch { /* ignore */ }
}

function notify() {
  _listeners.forEach(fn => fn())
}

function update(patch: Partial<ArenaState>) {
  _state = { ..._state, ...patch }
  save()
  notify()
}

export function subscribe(fn: () => void): () => void {
  _listeners.add(fn)
  return () => _listeners.delete(fn)
}

export function getState(): Readonly<ArenaState> { return _state }

// ─── Auth ─────────────────────────────────────────────────────────────────────

export function register(name: string): Player {
  const id = nanoid()
  const player = seedPlayer({ id, name, xp: 0 })
  update({
    players: [..._state.players, player],
    currentPlayer: player,
    arenaBalance: 1000,   // welcome bonus
  })
  pushActivity({ type: 'level_up', icon: 'user', message: `${name} joined the arena` })
  return player
}

export function login(name: string): Player | null {
  const p = _state.players.find(p => p.name.toLowerCase() === name.toLowerCase())
  if (!p) return null
  update({ currentPlayer: p })
  return p
}

export function logout() {
  update({ currentPlayer: null })
}

// ─── Activity ─────────────────────────────────────────────────────────────────

export function pushActivity(ev: Omit<ActivityEvent, 'id' | 'timestamp'>) {
  const event: ActivityEvent = { ...ev, id: nanoid(), timestamp: Date.now() }
  update({ activity: [event, ..._state.activity].slice(0, 50) })
}

// ─── Match Recording ──────────────────────────────────────────────────────────

export function recordMatch(m: Omit<MatchRecord, 'id' | 'playedAt'>): MatchRecord {
  const match: MatchRecord = { ...m, id: nanoid(), playedAt: Date.now() }
  const players = _state.players.map(p => {
    if (!m.players.includes(p.id)) return p
    const isWinner = p.id === m.winner
    const isDraw = m.winner === null
    const xpGain = isWinner ? xpForWin(p.rank) : isDraw ? 10 : 5
    const newXP = p.xp + xpGain
    const scoreIdx = m.players.indexOf(p.id) as 0 | 1
    return {
      ...p,
      wins:       p.wins   + (isWinner ? 1 : 0),
      losses:     p.losses + (!isWinner && !isDraw ? 1 : 0),
      draws:      p.draws  + (isDraw ? 1 : 0),
      xp:         newXP,
      level:      getLevel(newXP),
      rank:       getRank(newXP),
      streak:     isWinner ? p.streak + 1 : 0,
      totalScore: p.totalScore + (m.scores[scoreIdx] ?? 0),
      hexWins:    p.hexWins  + (isWinner && m.game === 'hex-wars'    ? 1 : 0),
      runnerBest: m.game === 'neon-runner'
        ? Math.max(p.runnerBest, m.scores[scoreIdx] ?? 0)
        : p.runnerBest,
    }
  })
  update({ matches: [match, ..._state.matches].slice(0, 200), players })

  // update currentPlayer if they played
  const cp = _state.currentPlayer
  if (cp && m.players.includes(cp.id)) {
    update({ currentPlayer: players.find(p => p.id === cp.id) ?? cp })
  }

  const winner = _state.players.find(p => p.id === m.winner)
  const p0 = _state.players.find(p => p.id === m.players[0])
  const p1 = _state.players.find(p => p.id === m.players[1])
  if (winner && p0 && p1) {
    const game = m.game === 'hex-wars' ? 'Hex Wars' : 'Neon Runner'
    pushActivity({
      type: 'match', icon: 'swords',
      message: `${p0.name} vs ${p1.name} in ${game} — ${winner.name} wins ${m.scores[0]}:${m.scores[1]}`
    })
  }
  return match
}

// ─── Tournaments ──────────────────────────────────────────────────────────────

export function joinTournament(tournamentId: string): boolean {
  const cp = _state.currentPlayer
  if (!cp) return false
  const t = _state.tournaments.find(t => t.id === tournamentId)
  if (!t || t.status !== 'open') return false
  if (t.players.includes(cp.id)) return false
  if (t.players.length >= t.maxPlayers) return false
  if (t.entryFee > 0 && _state.arenaBalance < t.entryFee) return false

  const newBalance = _state.arenaBalance - t.entryFee
  const updated = { ...t, players: [...t.players, cp.id] }
  const tournaments = _state.tournaments.map(x => x.id === tournamentId ? updated : x)
  update({ tournaments, arenaBalance: newBalance })
  pushActivity({ type: 'tournament', icon: 'trophy', message: `${cp.name} joined ${t.name}` })
  return true
}

export function buildBracket(tournamentId: string): BracketMatch[] {
  const t = _state.tournaments.find(t => t.id === tournamentId)
  if (!t) return []
  const players = [...t.players]
  // pad to power of 2
  while ((players.length & (players.length - 1)) !== 0) players.push('')
  const bracket: BracketMatch[] = []
  let round = 1
  for (let i = 0; i < players.length; i += 2) {
    bracket.push({
      id: nanoid(), round,
      p1: players[i] || null,
      p2: players[i + 1] || null,
      winner: null, score: [0, 0],
    })
  }
  return bracket
}

// ─── Staking ──────────────────────────────────────────────────────────────────

export function stakeArena(tournamentId: string, amount: number): boolean {
  const cp = _state.currentPlayer
  if (!cp) return false
  if (_state.arenaBalance < amount) return false
  const t = _state.tournaments.find(t => t.id === tournamentId)
  if (!t || t.status !== 'open') return false

  const stake: StakePosition = {
    playerId: cp.id,
    amount,
    tournamentId,
    lockedUntil: t.startsAt + 86400000,
    multiplier: 1.5 + (t.entryFee > 0 ? 0.5 : 0),
  }
  const newBalance = _state.arenaBalance - amount
  const updatedPlayer = { ...cp, stakedArena: cp.stakedArena + amount }
  const players = _state.players.map(p => p.id === cp.id ? updatedPlayer : p)
  update({
    stakes: [..._state.stakes, stake],
    arenaBalance: newBalance,
    currentPlayer: updatedPlayer,
    players,
  })
  pushActivity({ type: 'stake', icon: 'coins', message: `${cp.name} staked ${amount} $ARENA on ${t.name}` })
  return true
}

export function getMyStakes(): StakePosition[] {
  const cp = _state.currentPlayer
  if (!cp) return []
  return _state.stakes.filter(s => s.playerId === cp.id)
}

// ─── Leaderboard ──────────────────────────────────────────────────────────────

export function getLeaderboard(game?: 'hex-wars' | 'neon-runner') {
  const players = [..._state.players].sort((a, b) => {
    if (game === 'neon-runner') return b.runnerBest - a.runnerBest
    if (game === 'hex-wars')   return b.hexWins - a.hexWins
    return b.xp - a.xp
  })
  return players.map((player, i) => ({
    rank: i + 1,
    player,
    winRate: player.wins + player.losses > 0
      ? Math.round((player.wins / (player.wins + player.losses)) * 100)
      : 0,
    totalGames: player.wins + player.losses + player.draws,
  }))
}

// ─── Balance ──────────────────────────────────────────────────────────────────

export function addArena(amount: number) {
  update({ arenaBalance: _state.arenaBalance + amount })
}

export function getArenaBalance(): number { return _state.arenaBalance }
export function getUSDCBalance(): number  { return _state.usdcBalance }
