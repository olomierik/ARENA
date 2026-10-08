import { useState, useSyncExternalStore, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, Clock, Users, Lock, ChevronDown, ChevronUp, Zap, Sword } from 'lucide-react'
import { getState, subscribe, joinTournament, stakeArena, buildBracket } from '../../lib/store'
import { Tournament } from '../../lib/types'
import { Avatar } from '../ui/Avatar'
import { RankBadge } from '../ui/RankBadge'
import { ArenaAmount, ArenaIcon } from '../ui/ArenaToken'

function useStore() { return useSyncExternalStore(subscribe, getState) }

export function TournamentsPage() {
  const store = useStore()
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 10000)
    return () => clearInterval(id)
  }, [])
  const cp = store.currentPlayer
  const [expanded, setExpanded] = useState<string | null>(null)
  const [stakeAmount, setStakeAmount] = useState<Record<string, string>>({})
  const [stakeMsg, setStakeMsg]   = useState<Record<string, string>>({})

  function toggle(id: string) {
    setExpanded(prev => prev === id ? null : id)
  }

  function handleJoin(t: Tournament) {
    if (!cp) return
    const ok = joinTournament(t.id)
    if (!ok) alert(t.entryFee > 0 ? `Not enough $ARENA. You need ${t.entryFee}.` : 'Cannot join tournament.')
  }

  function handleStake(t: Tournament) {
    const amt = parseInt(stakeAmount[t.id] ?? '0', 10)
    if (!amt || amt <= 0) return
    const ok = stakeArena(t.id, amt)
    setStakeMsg(prev => ({
      ...prev,
      [t.id]: ok ? `Staked ${amt} $ARENA — locked until tournament ends` : 'Insufficient balance'
    }))
    setStakeAmount(prev => ({ ...prev, [t.id]: '' }))
  }

  const open      = store.tournaments.filter(t => t.status === 'open')
  const completed = store.tournaments.filter(t => t.status === 'completed')

  return (
    <div className="min-h-dvh bg-[#020817] px-4 py-8">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-display font-black text-white" style={{ letterSpacing: '-0.02em' }}>TOURNAMENTS</h1>
            <p className="text-[#475569] text-xs font-mono mt-0.5">{open.length} open · compete for $ARENA</p>
          </div>
          {cp && <ArenaAmount amount={store.arenaBalance} size="sm" />}
        </div>

        {!cp && (
          <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 px-4 py-3 text-yellow-400/80 text-xs font-mono mb-6">
            Register or sign in to join tournaments and stake $ARENA
          </div>
        )}

        {/* Open tournaments */}
        <div className="space-y-3">
          {open.map(t => {
            const isIn     = cp ? t.players.includes(cp.id) : false
            const isFull   = t.players.length >= t.maxPlayers
            const gameIcon = t.game === 'hex-wars' ? <Sword size={14} className="text-blue-400" /> : <Zap size={14} className="text-cyan-400" />
            const timeLeft = Math.max(0, t.startsAt - now)
            const hoursLeft = Math.floor(timeLeft / 3600000)
            const minsLeft  = Math.floor((timeLeft % 3600000) / 60000)
            const timeStr = hoursLeft > 0 ? `${hoursLeft}h ${minsLeft}m` : `${minsLeft}m`
            const gamePlayers = t.players.map(id => store.players.find(p => p.id === id)).filter(Boolean)

            return (
              <motion.div
                key={t.id}
                layout
                className="rounded-2xl border border-[#1E293B] bg-[#0F172A] overflow-hidden"
              >
                {/* Main row */}
                <div
                  className="flex items-center gap-3 px-4 py-4 cursor-pointer hover:bg-[#1E293B]/30 transition-colors"
                  onClick={() => toggle(t.id)}
                >
                  <div className="w-8 h-8 rounded-lg border border-[#334155] flex items-center justify-center shrink-0">
                    {gameIcon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white font-display font-bold text-sm">{t.name}</span>
                      {t.entryFee === 0 && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 font-mono">FREE</span>
                      )}
                      {t.entryFee > 0 && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 font-mono flex items-center gap-1">
                          <ArenaIcon size={8} />{t.entryFee}
                        </span>
                      )}
                      {isIn && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 font-mono">JOINED</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="flex items-center gap-1 text-[#475569] text-xs font-mono">
                        <Users size={10} />{t.players.length}/{t.maxPlayers}
                      </span>
                      <span className="flex items-center gap-1 text-[#475569] text-xs font-mono">
                        <Clock size={10} />{timeStr}
                      </span>
                      <span className="flex items-center gap-1 text-[#94A3B8] text-xs font-mono">
                        <ArenaIcon size={10} />{t.prizePool.toLocaleString()} prize
                      </span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-24 hidden sm:block">
                    <div className="h-1 bg-[#1E293B] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all"
                        style={{ width: `${(t.players.length / t.maxPlayers) * 100}%` }}
                      />
                    </div>
                    <div className="text-[#334155] text-[9px] font-mono mt-0.5 text-right">{t.maxPlayers - t.players.length} spots left</div>
                  </div>

                  {expanded === t.id ? <ChevronUp size={14} className="text-[#475569] shrink-0" /> : <ChevronDown size={14} className="text-[#475569] shrink-0" />}
                </div>

                {/* Expanded panel */}
                <AnimatePresence>
                  {expanded === t.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 border-t border-[#1E293B] pt-4 space-y-4">

                        {/* Players list */}
                        <div>
                          <div className="text-[#475569] text-[10px] font-mono uppercase mb-2">Registered players</div>
                          <div className="flex flex-wrap gap-2">
                            {gamePlayers.map(p => p && (
                              <div key={p.id} className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#1E293B]">
                                <Avatar seed={p.avatarSeed} size={18} />
                                <span className="text-[#94A3B8] text-xs font-mono">{p.name}</span>
                                <RankBadge rank={p.rank} />
                              </div>
                            ))}
                            {Array.from({ length: t.maxPlayers - t.players.length }).map((_, i) => (
                              <div key={i} className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-dashed border-[#1E293B]">
                                <div className="w-4 h-4 rounded-full bg-[#1E293B]" />
                                <span className="text-[#334155] text-xs font-mono">open</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Prize breakdown */}
                        <div className="rounded-xl bg-[#0A0F1A] p-3">
                          <div className="text-[#475569] text-[10px] font-mono uppercase mb-2">Prize pool breakdown</div>
                          <div className="flex items-center gap-6">
                            <div>
                              <ArenaAmount amount={Math.floor(t.prizePool * 0.6)} size="sm" showLabel={false} />
                              <div className="text-[#334155] text-[9px] font-mono">1st place (60%)</div>
                            </div>
                            <div>
                              <ArenaAmount amount={Math.floor(t.prizePool * 0.3)} size="sm" showLabel={false} />
                              <div className="text-[#334155] text-[9px] font-mono">2nd place (30%)</div>
                            </div>
                            <div>
                              <ArenaAmount amount={Math.floor(t.prizePool * 0.1)} size="sm" showLabel={false} />
                              <div className="text-[#334155] text-[9px] font-mono">3rd place (10%)</div>
                            </div>
                          </div>
                        </div>

                        {/* Staking */}
                        {cp && isIn && (
                          <div className="rounded-xl bg-[#0A0F1A] border border-[#1E3A5F] p-3">
                            <div className="text-[#475569] text-[10px] font-mono uppercase mb-2 flex items-center gap-1">
                              <Lock size={10} /> Stake for 1.5x boost
                            </div>
                            <p className="text-[#334155] text-xs mb-3">
                              Stake $ARENA on yourself. Win = 1.5x return. Lose = locked 24h, no loss.
                            </p>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min="1"
                                max={store.arenaBalance}
                                placeholder="Amount"
                                value={stakeAmount[t.id] ?? ''}
                                onChange={e => setStakeAmount(prev => ({ ...prev, [t.id]: e.target.value }))}
                                className="flex-1 bg-[#0F172A] border border-[#1E293B] rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-blue-500/50 min-w-0"
                              />
                              <button
                                onClick={() => handleStake(t)}
                                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-display font-bold transition-colors shrink-0"
                              >
                                STAKE
                              </button>
                            </div>
                            {stakeMsg[t.id] && (
                              <p className={`text-xs font-mono mt-2 ${stakeMsg[t.id].includes('Insufficient') ? 'text-red-400' : 'text-green-400'}`}>
                                {stakeMsg[t.id]}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Join button */}
                        {cp && !isIn && !isFull && (
                          <button
                            onClick={() => handleJoin(t)}
                            className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-display font-bold text-sm transition-colors"
                          >
                            {t.entryFee > 0 ? `JOIN — ${t.entryFee} $ARENA entry` : 'JOIN FREE'}
                          </button>
                        )}
                        {cp && isIn && (
                          <div className="text-center text-green-400 text-xs font-mono py-2">
                            You are registered. Tournament starts in {timeStr}.
                          </div>
                        )}
                        {isFull && !isIn && (
                          <div className="text-center text-[#475569] text-xs font-mono py-2">Tournament full</div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </div>

        {/* Completed */}
        {completed.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xs font-display font-bold text-[#475569] tracking-widest uppercase mb-4">PAST TOURNAMENTS</h2>
            <div className="space-y-2">
              {completed.map(t => (
                <div key={t.id} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-[#0F172A] bg-[#0A0D14]">
                  <Trophy size={14} className="text-yellow-400/50 shrink-0" />
                  <span className="text-[#334155] text-sm font-display flex-1">{t.name}</span>
                  <span className="text-[#1E293B] text-xs font-mono">
                    {t.winner ? store.players.find(p => p.id === t.winner)?.name ?? 'Unknown' : 'No winner'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
