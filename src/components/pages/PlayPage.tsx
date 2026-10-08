import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sword, Zap } from 'lucide-react'
import { HexWars } from '../../games/HexWars'
import { NeonRunner } from '../../games/NeonRunner'
import { getState, recordMatch } from '../../lib/store'
import { ArenaAmount } from '../ui/ArenaToken'

type Tab = 'hex-wars' | 'neon-runner'

export function PlayPage() {
  const [tab, setTab] = useState<Tab>('hex-wars')
  const store = getState()
  const cp = store.currentPlayer
  const name = cp?.name ?? 'Guest'

  function handleHexEnd(winner: 0 | 1 | null, scores: [number, number]) {
    if (!cp) return
    recordMatch({
      game: 'hex-wars',
      players: [cp.id, 'bot'],
      winner: winner === 0 ? cp.id : winner === null ? null : 'bot',
      scores,
      rounds: 20,
      duration: 0,
    })
  }

  function handleRunnerEnd(score: number) {
    if (!cp) return
    recordMatch({
      game: 'neon-runner',
      players: [cp.id, 'bot'],
      winner: cp.id,
      scores: [score, 0],
      rounds: 1,
      duration: 0,
    })
  }

  return (
    <div className="min-h-dvh bg-[#020817] px-4 py-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-display font-black text-white" style={{ letterSpacing: '-0.02em' }}>ARENA</h1>
            <p className="text-[#475569] text-xs font-mono">Playing as <span className="text-blue-400">{name}</span></p>
          </div>
          {cp && (
            <div className="flex items-center gap-3">
              <ArenaAmount amount={store.arenaBalance} size="sm" />
            </div>
          )}
        </div>

        {/* Tab switcher */}
        <div className="flex gap-2 mb-8 p-1 bg-[#0F172A] rounded-xl border border-[#1E293B] w-fit">
          {([
            { id: 'hex-wars' as Tab,    label: 'HEX WARS',    icon: <Sword size={14} />   },
            { id: 'neon-runner' as Tab, label: 'NEON RUNNER',  icon: <Zap size={14} />     },
          ]).map(({ id, label, icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-display font-bold transition-all ${
                tab === id
                  ? id === 'hex-wars' ? 'bg-blue-600 text-white' : 'bg-cyan-600 text-white'
                  : 'text-[#64748B] hover:text-[#94A3B8]'
              }`}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>

        {/* Game */}
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="flex justify-center"
          >
            {tab === 'hex-wars' && (
              <HexWars playerName={name} onMatchEnd={handleHexEnd} mode="pvb" />
            )}
            {tab === 'neon-runner' && (
              <NeonRunner
                highScore={cp?.runnerBest ?? 0}
                onMatchEnd={handleRunnerEnd}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
