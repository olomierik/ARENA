import { useState, useSyncExternalStore } from 'react'
import { motion } from 'framer-motion'
import { Trophy, Sword, Zap, TrendingUp } from 'lucide-react'
import { getState, subscribe, getLeaderboard } from '../../lib/store'
import { Avatar } from '../ui/Avatar'
import { RankBadge } from '../ui/RankBadge'

function useStore() { return useSyncExternalStore(subscribe, getState) }

type Filter = 'overall' | 'hex-wars' | 'neon-runner'

export function LeaderboardPage() {
  useStore()
  const [filter, setFilter] = useState<Filter>('overall')
  const board = getLeaderboard(filter === 'overall' ? undefined : filter)
  const top3 = board.slice(0, 3)
  const rest  = board.slice(3)

  const podiumOrder = [1, 0, 2] // silver, gold, bronze visual order

  return (
    <div className="min-h-dvh bg-[#020817] px-4 py-8">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-display font-black text-white mb-1" style={{ letterSpacing: '-0.02em' }}>LEADERBOARD</h1>
          <p className="text-[#475569] text-xs font-mono">Ranked by XP, hex wins, or runner score</p>
        </div>

        {/* Filter */}
        <div className="flex gap-2 justify-center mb-8 p-1 bg-[#0F172A] rounded-xl border border-[#1E293B] w-fit mx-auto">
          {([
            { id: 'overall' as Filter,     label: 'OVERALL',   icon: <TrendingUp size={12} /> },
            { id: 'hex-wars' as Filter,    label: 'HEX WARS',  icon: <Sword size={12} />      },
            { id: 'neon-runner' as Filter, label: 'RUNNER',    icon: <Zap size={12} />        },
          ]).map(({ id, label, icon }) => (
            <button
              key={id}
              onClick={() => setFilter(id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-display font-bold transition-all ${
                filter === id ? 'bg-[#1E293B] text-white' : 'text-[#475569] hover:text-[#94A3B8]'
              }`}
            >
              {icon}{label}
            </button>
          ))}
        </div>

        {/* Podium */}
        {top3.length >= 3 && (
          <div className="flex items-end justify-center gap-3 mb-8 px-4">
            {podiumOrder.map((idx) => {
              const entry = top3[idx]
              if (!entry) return null
              const heights = ['h-20', 'h-28', 'h-16']
              const medalColors = ['#C0C0C0', '#FFD700', '#CD7F32']
              const medals = ['2nd', '1st', '3rd']
              const isFirst = idx === 0

              return (
                <motion.div
                  key={entry.player.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className={`flex flex-col items-center gap-2 flex-1 ${isFirst ? 'scale-105' : ''}`}
                >
                  {isFirst && (
                    <Trophy size={20} className="text-yellow-400" />
                  )}
                  <Avatar seed={entry.player.avatarSeed} size={isFirst ? 48 : 40} />
                  <div className="text-center">
                    <div className="text-white text-xs font-display font-bold truncate max-w-[80px]">{entry.player.name}</div>
                    <div className="text-[#475569] text-[10px] font-mono">{entry.winRate}% WR</div>
                  </div>
                  <div
                    className={`w-full ${heights[idx]} rounded-t-xl flex items-start justify-center pt-2`}
                    style={{ backgroundColor: medalColors[idx] + '20', border: `1px solid ${medalColors[idx]}30` }}
                  >
                    <span className="font-display font-black text-sm" style={{ color: medalColors[idx] }}>{medals[idx]}</span>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}

        {/* Full table */}
        <div className="rounded-2xl border border-[#1E293B] bg-[#0F172A] overflow-hidden">
          <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-x-3 px-4 py-2 border-b border-[#1E293B]">
            <span className="text-[#334155] text-[10px] font-mono">#</span>
            <span className="text-[#334155] text-[10px] font-mono">PLAYER</span>
            <span className="text-[#334155] text-[10px] font-mono text-right">W/L</span>
            <span className="text-[#334155] text-[10px] font-mono text-right hidden sm:block">XP</span>
            <span className="text-[#334155] text-[10px] font-mono text-right">RANK</span>
          </div>

          {board.map((entry, i) => (
            <motion.div
              key={entry.player.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-x-3 items-center px-4 py-3 border-b border-[#0F172A] hover:bg-[#1E293B]/20 transition-colors last:border-0"
            >
              <span className={`w-5 text-right font-mono text-xs ${i < 3 ? 'text-yellow-400/70 font-bold' : 'text-[#334155]'}`}>
                {i + 1}
              </span>
              <div className="flex items-center gap-2 min-w-0">
                <Avatar seed={entry.player.avatarSeed} size={28} />
                <div className="min-w-0">
                  <div className="text-white text-xs font-display font-semibold truncate">{entry.player.name}</div>
                  <div className="text-[#334155] text-[10px] font-mono">
                    {filter === 'neon-runner'
                      ? `Best: ${entry.player.runnerBest.toLocaleString()}`
                      : filter === 'hex-wars'
                      ? `${entry.player.hexWins} hex wins`
                      : `${entry.totalGames} games`
                    }
                  </div>
                </div>
              </div>
              <div className="text-right">
                <span className="text-green-400 text-xs font-mono">{entry.player.wins}W</span>
                <span className="text-[#334155] text-xs font-mono"> / </span>
                <span className="text-red-400 text-xs font-mono">{entry.player.losses}L</span>
              </div>
              <div className="text-right hidden sm:block">
                <span className="text-[#94A3B8] font-mono text-xs tabular-nums">{entry.player.xp.toLocaleString()}</span>
              </div>
              <div className="text-right">
                <RankBadge rank={entry.player.rank} />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
