import { useSyncExternalStore, useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Sword, Zap, Trophy, TrendingUp, Clock, Activity } from 'lucide-react'
import { getState, subscribe } from '../../lib/store'
import { Avatar } from '../ui/Avatar'
import { RankBadge } from '../ui/RankBadge'
import { ArenaAmount, ArenaIcon } from '../ui/ArenaToken'
import { RANK_TIERS } from '../../lib/types'

function useStore() { return useSyncExternalStore(subscribe, getState) }

interface Props { onNavigate: (page: string) => void }

export function DashboardPage({ onNavigate }: Props) {
  const store = useStore()
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 5000)
    return () => clearInterval(id)
  }, [])
  const cp = store.currentPlayer

  if (!cp) {
    return (
      <div className="min-h-dvh bg-[#020817] flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="text-[#475569] font-mono text-sm mb-4">Sign in to see your dashboard</div>
          <button
            onClick={() => onNavigate('home')}
            className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-display font-bold text-sm transition-colors"
          >
            GO HOME
          </button>
        </div>
      </div>
    )
  }

  const myMatches = store.matches.filter(m => m.players.includes(cp.id)).slice(0, 8)
  const myStakes  = store.stakes.filter(s => s.playerId === cp.id)

  // XP to next rank
  const currentTierIdx = RANK_TIERS.findIndex(r => r.tier === cp.rank)
  const nextTier = RANK_TIERS[currentTierIdx + 1]
  const currentTierXP = RANK_TIERS[currentTierIdx]?.minXP ?? 0
  const nextTierXP    = nextTier?.minXP ?? currentTierXP + 1000
  const xpProgress    = Math.min(1, (cp.xp - currentTierXP) / (nextTierXP - currentTierXP))

  const winRate = cp.wins + cp.losses > 0
    ? Math.round((cp.wins / (cp.wins + cp.losses)) * 100)
    : 0

  return (
    <div className="min-h-dvh bg-[#020817] px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Profile card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-[#1E293B] bg-[#0F172A] p-5"
        >
          <div className="flex items-start gap-4">
            <Avatar seed={cp.avatarSeed} size={64} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h2 className="text-xl font-display font-black text-white" style={{ letterSpacing: '-0.02em' }}>{cp.name}</h2>
                <RankBadge rank={cp.rank} size="md" />
                {cp.streak >= 3 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 font-mono">
                    {cp.streak}🔥 STREAK
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 mb-3 flex-wrap">
                <span className="text-[#64748B] text-xs font-mono">Lv. {cp.level}</span>
                <span className="text-[#64748B] text-xs font-mono">{cp.xp.toLocaleString()} XP</span>
                <span className="text-green-400 text-xs font-mono">{cp.wins}W</span>
                <span className="text-red-400 text-xs font-mono">{cp.losses}L</span>
                <span className="text-[#64748B] text-xs font-mono">{winRate}% WR</span>
              </div>

              {/* XP progress to next rank */}
              {nextTier && (
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-[#334155] text-[10px] font-mono">XP to {nextTier.tier}</span>
                    <span className="text-[#334155] text-[10px] font-mono">{cp.xp - currentTierXP} / {nextTierXP - currentTierXP}</span>
                  </div>
                  <div className="h-1.5 bg-[#1E293B] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${xpProgress * 100}%`,
                        backgroundColor: nextTier.color,
                        boxShadow: `0 0 8px ${nextTier.color}60`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Balance */}
            <div className="text-right shrink-0">
              <ArenaAmount amount={store.arenaBalance} size="lg" />
              <div className="text-[#334155] text-[10px] font-mono mt-1">USDC: {store.usdcBalance}</div>
            </div>
          </div>
        </motion.div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Hex Wins',    value: cp.hexWins,           icon: <Sword size={14} className="text-blue-400" />,   color: '#3B82F6' },
            { label: 'Best Run',    value: cp.runnerBest.toLocaleString(), icon: <Zap size={14} className="text-cyan-400" />,    color: '#06B6D4' },
            { label: 'Tournaments', value: cp.tournamentWins,    icon: <Trophy size={14} className="text-yellow-400" />, color: '#FBBF24' },
            { label: '$ARENA Staked', value: cp.stakedArena.toLocaleString(), icon: <ArenaIcon size={14} />,  color: '#FBBF24' },
          ].map(({ label, value, icon, color }) => (
            <div key={label} className="rounded-xl border border-[#1E293B] bg-[#0F172A] p-4">
              <div className="flex items-center gap-2 mb-2">{icon}<span className="text-[#475569] text-[10px] font-mono uppercase">{label}</span></div>
              <div className="font-mono font-black text-xl tabular-nums" style={{ color }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => onNavigate('play')}
            className="flex items-center gap-2 px-4 py-3 rounded-xl border border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10 text-blue-400 font-display font-bold text-sm transition-all"
          >
            <Sword size={16} />
            PLAY HEX WARS
          </button>
          <button
            onClick={() => onNavigate('play')}
            className="flex items-center gap-2 px-4 py-3 rounded-xl border border-cyan-500/30 bg-cyan-500/5 hover:bg-cyan-500/10 text-cyan-400 font-display font-bold text-sm transition-all"
          >
            <Zap size={16} />
            NEON RUNNER
          </button>
          <button
            onClick={() => onNavigate('tournaments')}
            className="flex items-center gap-2 px-4 py-3 rounded-xl border border-yellow-500/30 bg-yellow-500/5 hover:bg-yellow-500/10 text-yellow-400 font-display font-bold text-sm transition-all"
          >
            <Trophy size={16} />
            TOURNAMENTS
          </button>
          <button
            onClick={() => onNavigate('leaderboard')}
            className="flex items-center gap-2 px-4 py-3 rounded-xl border border-green-500/30 bg-green-500/5 hover:bg-green-500/10 text-green-400 font-display font-bold text-sm transition-all"
          >
            <TrendingUp size={16} />
            LEADERBOARD
          </button>
        </div>

        {/* Staking positions */}
        {myStakes.length > 0 && (
          <div>
            <h3 className="text-xs font-display font-bold text-[#475569] uppercase tracking-widest mb-3">MY STAKES</h3>
            <div className="space-y-2">
              {myStakes.map((stake, i) => {
                const t = store.tournaments.find(t => t.id === stake.tournamentId)
                const locked = stake.lockedUntil > now
                return (
                  <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-[#1E293B] bg-[#0F172A]">
                    <ArenaIcon size={16} />
                    <div className="flex-1">
                      <div className="text-white text-xs font-mono">{t?.name ?? 'Tournament'}</div>
                      <div className="text-[#475569] text-[10px] font-mono flex items-center gap-1">
                        {locked ? <><Lock size={8} /> Locked</> : 'Unlocked'} · {stake.multiplier}x multiplier
                      </div>
                    </div>
                    <ArenaAmount amount={stake.amount} size="sm" showLabel={false} />
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Match history */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Activity size={12} className="text-[#475569]" />
            <h3 className="text-xs font-display font-bold text-[#475569] uppercase tracking-widest">RECENT MATCHES</h3>
          </div>
          {myMatches.length === 0 ? (
            <div className="text-center py-8 text-[#334155] text-xs font-mono">
              No matches yet — <button onClick={() => onNavigate('play')} className="text-blue-400 hover:underline">play your first game</button>
            </div>
          ) : (
            <div className="rounded-2xl border border-[#1E293B] bg-[#0F172A] overflow-hidden">
              {myMatches.map((m, i) => {
                const won = m.winner === cp.id
                const draw = m.winner === null
                const oppId = m.players.find(id => id !== cp.id) ?? ''
                const opp = store.players.find(p => p.id === oppId)
                const myIdx = m.players.indexOf(cp.id) as 0 | 1
                const oppIdx = (1 - myIdx) as 0 | 1
                const age = Math.round((now - m.playedAt) / 60000)
                const ageStr = age < 1 ? 'just now' : age < 60 ? `${age}m ago` : `${Math.floor(age / 60)}h ago`
                const gameIcon = m.game === 'hex-wars' ? <Sword size={12} /> : <Zap size={12} />

                return (
                  <div
                    key={m.id}
                    className={`flex items-center gap-3 px-4 py-3 border-b border-[#0F172A] last:border-0 ${i % 2 === 0 ? '' : 'bg-[#0A0D14]'}`}
                  >
                    <div className={`text-xs font-mono shrink-0 ${won ? 'text-green-400' : draw ? 'text-yellow-400' : 'text-red-400'}`}>
                      {won ? 'WIN' : draw ? 'DRAW' : 'LOSS'}
                    </div>
                    <div className={`shrink-0 ${m.game === 'hex-wars' ? 'text-blue-400' : 'text-cyan-400'}`}>{gameIcon}</div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[#94A3B8] text-xs font-mono">vs <span className="text-white">{opp?.name ?? 'BOT'}</span></span>
                    </div>
                    <div className="text-[#64748B] font-mono text-xs tabular-nums">
                      {m.scores[myIdx]}–{m.scores[oppIdx]}
                    </div>
                    <div className="text-[#334155] text-[10px] font-mono shrink-0 hidden sm:block">{ageStr}</div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Activity */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Clock size={12} className="text-[#475569]" />
            <h3 className="text-xs font-display font-bold text-[#475569] uppercase tracking-widest">ARENA ACTIVITY</h3>
          </div>
          <div className="space-y-1.5">
            {store.activity.slice(0, 6).map(ev => {
              const age = Math.round((now - ev.timestamp) / 1000)
              const ageLabel = age < 60 ? `${age}s ago` : `${Math.round(age / 60)}m ago`
              return (
                <div key={ev.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#0F172A]">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400/60 shrink-0" />
                  <span className="text-[#64748B] text-xs font-mono flex-1">{ev.message}</span>
                  <span className="text-[#1E293B] text-[10px] font-mono shrink-0">{ageLabel}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// tiny lock icon inline
function Lock({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  )
}
