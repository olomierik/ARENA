// ─── AGENT ARENA — Core Types ─────────────────────────────────────────────────

export type RankTier = 'Bronze' | 'Silver' | 'Gold' | 'Diamond' | 'Apex'

export interface Player {
  id: string
  name: string
  avatarSeed: string        // deterministic avatar color seed
  wins: number
  losses: number
  draws: number
  totalScore: number
  xp: number
  level: number
  rank: RankTier
  streak: number
  hexWins: number
  runnerBest: number        // best NEON RUNNER score
  stakedArena: number       // $ARENA staked
  tournamentWins: number
  joinedAt: number
}

export interface MatchRecord {
  id: string
  game: 'hex-wars' | 'neon-runner'
  players: [string, string]   // player ids
  winner: string | null       // player id or null for draw
  scores: [number, number]
  rounds: number
  duration: number            // ms
  playedAt: number
  replayData?: string         // compressed action log
}

export type TournamentStatus = 'open' | 'running' | 'completed' | 'cancelled'

export interface Tournament {
  id: string
  name: string
  game: 'hex-wars' | 'neon-runner'
  entryFee: number            // $ARENA (0 = free)
  prizePool: number           // $ARENA
  maxPlayers: number
  players: string[]           // player ids
  status: TournamentStatus
  winner: string | null
  createdAt: number
  startsAt: number
  completedAt: number | null
  bracket: BracketMatch[]
}

export interface BracketMatch {
  id: string
  round: number
  p1: string | null
  p2: string | null
  winner: string | null
  score: [number, number]
}

export interface StakePosition {
  playerId: string
  amount: number              // $ARENA
  tournamentId: string
  lockedUntil: number         // timestamp
  multiplier: number
}

export interface LeaderboardEntry {
  rank: number
  player: Player
  winRate: number
  totalGames: number
}

export interface ActivityEvent {
  id: string
  type: 'match' | 'tournament' | 'stake' | 'level_up' | 'achievement'
  message: string
  timestamp: number
  icon: string
}

export interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  unlockedAt: number
}

export const RANK_TIERS: { tier: RankTier; minXP: number; color: string }[] = [
  { tier: 'Bronze',  minXP: 0,    color: '#CD7F32' },
  { tier: 'Silver',  minXP: 500,  color: '#C0C0C0' },
  { tier: 'Gold',    minXP: 1500, color: '#FFD700' },
  { tier: 'Diamond', minXP: 3500, color: '#B9F2FF' },
  { tier: 'Apex',    minXP: 8000, color: '#FF6EC7' },
]

export function getRank(xp: number): RankTier {
  for (let i = RANK_TIERS.length - 1; i >= 0; i--) {
    if (xp >= RANK_TIERS[i].minXP) return RANK_TIERS[i].tier
  }
  return 'Bronze'
}

export function getRankColor(rank: RankTier): string {
  return RANK_TIERS.find(r => r.tier === rank)?.color ?? '#CD7F32'
}

export function getLevel(xp: number): number {
  return Math.floor(Math.sqrt(xp / 50)) + 1
}

export function xpForWin(rank: RankTier): number {
  const map: Record<RankTier, number> = { Bronze: 30, Silver: 40, Gold: 55, Diamond: 70, Apex: 90 }
  return map[rank]
}
