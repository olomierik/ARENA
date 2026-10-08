import { motion } from 'framer-motion'
import { Sword, Zap, Trophy, TrendingUp, Shield, Users, ChevronRight, Activity } from 'lucide-react'
import { useEffect, useState, useSyncExternalStore } from 'react'
import { getState, subscribe } from '../../lib/store'
import { Avatar } from '../ui/Avatar'
import { RankBadge } from '../ui/RankBadge'
import { ArenaAmount, ArenaIcon } from '../ui/ArenaToken'

function formatAge(ts: number, now: number): string {
  const age = Math.round((now - ts) / 1000)
  return age < 60 ? `${age}s ago` : `${Math.round(age / 60)}m ago`
}

interface Props { onNavigate: (page: string) => void }

function useStore() { return useSyncExternalStore(subscribe, getState) }

export function LandingPage({ onNavigate }: Props) {
  const store = useStore()
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 3000)
    return () => clearInterval(id)
  }, [])

  const topPlayers = store.players.slice().sort((a, b) => b.xp - a.xp).slice(0, 5)
  const recentActivity = store.activity.slice(0, 6)

  return (
    <div className="min-h-dvh bg-[#020817]">
      {/* Hero */}
      <section className="relative overflow-hidden px-4 pt-20 pb-16 text-center">
        {/* Grid bg */}
        <div className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: 'linear-gradient(rgba(59,130,246,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.03) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        {/* Glow */}
        <div className="pointer-events-none absolute left-1/2 top-1/4 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full opacity-10"
          style={{ background: 'radial-gradient(ellipse, #3B82F6 0%, transparent 70%)' }}
        />

        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#1E3A5F] bg-[#0F172A] mb-6">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[#64748B] text-xs font-mono">{store.players.length} players online · {store.tournaments.filter(t => t.status === 'open').length} tournaments live</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-display font-black text-white mb-4" style={{ letterSpacing: '-0.03em' }}>
            PLAY.{' '}
            <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(135deg, #3B82F6, #06B6D4)' }}>
              COMPETE.
            </span>
            {' '}EARN.
          </h1>

          <p className="text-[#64748B] text-lg max-w-xl mx-auto mb-8 font-body" style={{ textWrap: 'balance' }}>
            Two skill-based games. Real tournament stakes. Your score earns <strong className="text-[#FBBF24]">$ARENA</strong> — a token backed by platform activity, not hype.
          </p>

          <div className="flex items-center justify-center gap-3 flex-wrap">
            <button
              onClick={() => onNavigate('play')}
              className="px-8 py-3 rounded-xl font-display font-bold text-white transition-all hover:scale-105 active:scale-95"
              style={{ background: 'linear-gradient(135deg, #1D4ED8, #3B82F6)' }}
            >
              PLAY NOW
            </button>
            <button
              onClick={() => onNavigate('tournaments')}
              className="px-8 py-3 rounded-xl font-display font-bold border border-[#334155] text-[#94A3B8] hover:border-[#475569] hover:text-white transition-all"
            >
              VIEW TOURNAMENTS
            </button>
          </div>
        </motion.div>
      </section>

      {/* Games showcase */}
      <section className="px-4 pb-16 max-w-5xl mx-auto">
        <h2 className="text-xs font-display font-bold text-[#475569] tracking-widest uppercase mb-6 text-center">THE GAMES</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {/* Hex Wars */}
          <motion.div
            initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
            className="relative overflow-hidden rounded-2xl border border-[#1E293B] bg-[#0F172A] p-6 cursor-pointer group hover:border-blue-500/40 transition-all"
            onClick={() => onNavigate('play')}
          >
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ background: 'radial-gradient(ellipse at 30% 50%, rgba(59,130,246,0.07) 0%, transparent 70%)' }} />
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Sword size={16} className="text-blue-400" />
                  <span className="text-[#64748B] text-xs font-mono uppercase tracking-widest">Territory Control</span>
                </div>
                <h3 className="text-2xl font-display font-black text-white" style={{ letterSpacing: '-0.02em' }}>HEX WARS</h3>
              </div>
              <ChevronRight size={20} className="text-[#334155] group-hover:text-blue-400 transition-colors mt-1" />
            </div>
            <p className="text-[#64748B] text-sm mb-4">
              Claim hexagonal territory, fortify your base, attack enemies. Turn-based, pure strategy. No luck — only skill.
            </p>
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-blue-400 font-mono font-bold text-sm">20</div>
                <div className="text-[#475569] text-[10px] font-mono">ROUNDS</div>
              </div>
              <div className="text-center">
                <div className="text-blue-400 font-mono font-bold text-sm">2P</div>
                <div className="text-[#475569] text-[10px] font-mono">PLAYERS</div>
              </div>
              <div className="text-center">
                <div className="text-blue-400 font-mono font-bold text-sm">HEX</div>
                <div className="text-[#475569] text-[10px] font-mono">GRID</div>
              </div>
            </div>
            {/* Fake hex grid preview */}
            <div className="absolute right-4 bottom-4 opacity-20">
              <svg width="80" height="60" viewBox="0 0 80 60">
                {[[20,15],[40,15],[60,15],[10,30],[30,30],[50,30],[20,45],[40,45],[60,45]].map(([cx,cy],i) => (
                  <polygon key={i}
                    points={`${cx},${cy-10} ${cx+9},${cy-5} ${cx+9},${cy+5} ${cx},${cy+10} ${cx-9},${cy+5} ${cx-9},${cy-5}`}
                    fill={i < 3 ? '#1D4ED8' : i > 5 ? '#991B1B' : '#1E293B'}
                    stroke="#334155" strokeWidth="1"
                  />
                ))}
              </svg>
            </div>
          </motion.div>

          {/* Neon Runner */}
          <motion.div
            initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
            className="relative overflow-hidden rounded-2xl border border-[#1E293B] bg-[#020B18] p-6 cursor-pointer group hover:border-cyan-500/40 transition-all"
            onClick={() => onNavigate('play')}
          >
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ background: 'radial-gradient(ellipse at 70% 50%, rgba(6,182,212,0.07) 0%, transparent 70%)' }} />
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Zap size={16} className="text-cyan-400" />
                  <span className="text-[#64748B] text-xs font-mono uppercase tracking-widest">Endless Runner</span>
                </div>
                <h3 className="text-2xl font-display font-black text-white" style={{ letterSpacing: '-0.02em' }}>NEON RUNNER</h3>
              </div>
              <ChevronRight size={20} className="text-[#334155] group-hover:text-cyan-400 transition-colors mt-1" />
            </div>
            <p className="text-[#64748B] text-sm mb-4">
              Three lanes. Infinite obstacles. Speed ramps every 5 seconds. Collect power-ups. Submit your high score for prize pools.
            </p>
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-cyan-400 font-mono font-bold text-sm">∞</div>
                <div className="text-[#475569] text-[10px] font-mono">ENDLESS</div>
              </div>
              <div className="text-center">
                <div className="text-cyan-400 font-mono font-bold text-sm">3</div>
                <div className="text-[#475569] text-[10px] font-mono">LANES</div>
              </div>
              <div className="text-center">
                <div className="text-cyan-400 font-mono font-bold text-sm">HI</div>
                <div className="text-[#475569] text-[10px] font-mono">SCORE</div>
              </div>
            </div>
            <div className="absolute right-4 bottom-4 opacity-30">
              <div className="flex gap-1">
                {[0,1,2].map(i => (
                  <div key={i} className="w-4 flex flex-col gap-1">
                    <div className="h-2 rounded bg-red-500" style={{ opacity: i === 1 ? 1 : 0.3 }} />
                    <div className="h-5 rounded" style={{ background: 'linear-gradient(#00E5FF, #0284C7)' }} />
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* DeFi / Token section */}
      <section className="px-4 pb-16 max-w-5xl mx-auto">
        <h2 className="text-xs font-display font-bold text-[#475569] tracking-widest uppercase mb-6 text-center">THE ECONOMY</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            {
              icon: ArenaIcon,
              iconEl: <ArenaIcon size={28} />,
              title: '$ARENA TOKEN',
              desc: 'Earned by winning matches. Spent on tournament entry. Staked for yield. 100% utility — no ICO.',
              stat: '1,000', statLabel: 'welcome bonus',
              color: '#FBBF24',
            },
            {
              icon: Shield,
              iconEl: <Shield size={28} className="text-blue-400" />,
              title: 'STAKE & EARN',
              desc: 'Stake $ARENA on yourself before a tournament. Win = 1.5x multiplier. Lose = 24h lock, no loss.',
              stat: '1.5x', statLabel: 'win multiplier',
              color: '#3B82F6',
            },
            {
              icon: TrendingUp,
              iconEl: <TrendingUp size={28} className="text-green-400" />,
              title: 'PRIZE POOLS',
              desc: 'Entry fees flow into prize pools. Winners claim directly. No house cut on free tournaments.',
              stat: '500+', statLabel: '$ARENA pooled',
              color: '#10B981',
            },
          ].map(({ iconEl, title, desc, stat, statLabel, color }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.1 }}
              className="rounded-2xl border border-[#1E293B] bg-[#0F172A] p-5"
            >
              <div className="mb-3">{iconEl}</div>
              <h3 className="font-display font-bold text-white text-sm mb-2">{title}</h3>
              <p className="text-[#64748B] text-xs mb-4 leading-relaxed">{desc}</p>
              <div>
                <span className="font-mono font-black text-xl tabular-nums" style={{ color }}>{stat}</span>
                <span className="text-[#475569] text-xs ml-2">{statLabel}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Leaderboard preview */}
      <section className="px-4 pb-16 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xs font-display font-bold text-[#475569] tracking-widest uppercase">TOP PLAYERS</h2>
          <button onClick={() => onNavigate('leaderboard')} className="text-xs text-blue-400 hover:text-blue-300 font-mono flex items-center gap-1">
            Full rankings <ChevronRight size={12} />
          </button>
        </div>
        <div className="rounded-2xl border border-[#1E293B] bg-[#0F172A] overflow-hidden">
          {topPlayers.map((p, i) => (
            <div
              key={p.id}
              className="flex items-center gap-3 px-4 py-3 border-b border-[#0F172A] hover:bg-[#1E293B]/30 transition-colors last:border-0"
            >
              <span className="w-5 text-right font-mono text-sm text-[#475569]">#{i + 1}</span>
              <Avatar seed={p.avatarSeed} size={32} />
              <div className="flex-1 min-w-0">
                <div className="text-white text-sm font-display font-semibold truncate">{p.name}</div>
                <div className="text-[#475569] text-xs font-mono">{p.wins}W · {p.losses}L</div>
              </div>
              <RankBadge rank={p.rank} />
              <div className="text-right">
                <div className="text-[#94A3B8] font-mono text-xs tabular-nums">{p.xp.toLocaleString()} XP</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Activity feed */}
      <section className="px-4 pb-20 max-w-5xl mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <Activity size={14} className="text-green-400" />
          <h2 className="text-xs font-display font-bold text-[#475569] tracking-widest uppercase">LIVE ACTIVITY</h2>
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        </div>
        <div className="space-y-2">
          {recentActivity.map((ev, i) => {
            const ageLabel = formatAge(ev.timestamp, now)
            return (
              <motion.div
                key={ev.id}
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-3 py-2 px-3 rounded-lg bg-[#0F172A] border border-[#1E293B]"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
                <span className="text-[#94A3B8] text-xs flex-1 font-mono">{ev.message}</span>
                <span className="text-[#334155] text-xs font-mono shrink-0">{ageLabel}</span>
              </motion.div>
            )
          })}
        </div>
      </section>

      {/* How it works */}
      <section className="px-4 pb-20 max-w-5xl mx-auto border-t border-[#0F172A]">
        <h2 className="text-xs font-display font-bold text-[#475569] tracking-widest uppercase mb-8 text-center mt-12">HOW IT WORKS</h2>
        <div className="grid md:grid-cols-4 gap-6">
          {[
            { step: '01', title: 'Register', desc: 'Create your account. Get 1,000 $ARENA as a welcome bonus.', icon: <Users size={20} className="text-blue-400" /> },
            { step: '02', title: 'Play games', desc: 'Compete in Hex Wars or Neon Runner. Earn XP and $ARENA for wins.', icon: <Sword size={20} className="text-purple-400" /> },
            { step: '03', title: 'Enter tournaments', desc: 'Join free or paid tournaments. Stake extra $ARENA to boost your prize.', icon: <Trophy size={20} className="text-yellow-400" /> },
            { step: '04', title: 'Earn & stake', desc: 'Win $ARENA. Stake it for yield. Climb the ranks. Apex is waiting.', icon: <TrendingUp size={20} className="text-green-400" /> },
          ].map(({ step, title, desc, icon }) => (
            <div key={step} className="text-center">
              <div className="w-10 h-10 rounded-xl bg-[#0F172A] border border-[#1E293B] flex items-center justify-center mx-auto mb-3">
                {icon}
              </div>
              <div className="text-[#334155] font-mono text-xs mb-1">{step}</div>
              <div className="text-white font-display font-bold text-sm mb-2">{title}</div>
              <div className="text-[#475569] text-xs leading-relaxed">{desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA footer */}
      <section className="px-4 pb-20 text-center">
        <div className="max-w-lg mx-auto rounded-2xl border border-[#1E3A5F] bg-[#0A1628] p-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <ArenaAmount amount={1000} size="lg" />
          </div>
          <p className="text-[#64748B] text-sm mb-6">Welcome bonus waiting for you. No wallet required to start playing.</p>
          <button
            onClick={() => onNavigate('play')}
            className="px-8 py-3 rounded-xl font-display font-bold text-white w-full transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #1D4ED8, #0284C7)' }}
          >
            CLAIM AND PLAY NOW
          </button>
        </div>
      </section>
    </div>
  )
}
