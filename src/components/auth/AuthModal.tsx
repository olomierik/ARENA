import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { register, login } from '../../lib/store'
import { Player } from '../../lib/types'
import { ArenaAmount } from '../ui/ArenaToken'

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: (player: Player) => void
}

export function AuthModal({ open, onClose, onSuccess }: Props) {
  const [mode, setMode]   = useState<'register' | 'login'>('register')
  const [name, setName]   = useState('')
  const [error, setError] = useState('')

  function handleSubmit() {
    const trimmed = name.trim()
    if (!trimmed || trimmed.length < 2) { setError('Name must be at least 2 characters'); return }
    if (trimmed.length > 20)           { setError('Name must be 20 characters or less'); return }

    if (mode === 'register') {
      const p = register(trimmed)
      onSuccess(p)
    } else {
      const p = login(trimmed)
      if (!p) { setError('Player not found — check your name or register'); return }
      onSuccess(p)
    }
    setName(''); setError(''); onClose()
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={e => { if (e.target === e.currentTarget) onClose() }}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
            className="w-full max-w-sm bg-[#0F172A] border border-[#1E293B] rounded-2xl p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-display font-black text-white" style={{ letterSpacing: '-0.02em' }}>
                {mode === 'register' ? 'JOIN THE ARENA' : 'SIGN IN'}
              </h2>
              <button onClick={onClose} className="text-[#475569] hover:text-[#94A3B8] transition-colors">
                <X size={18} />
              </button>
            </div>

            {mode === 'register' && (
              <div className="rounded-xl bg-[#0A1628] border border-[#1E3A5F] px-4 py-3 mb-5 flex items-center gap-2">
                <ArenaAmount amount={1000} size="sm" />
                <span className="text-[#64748B] text-xs font-mono">welcome bonus</span>
              </div>
            )}

            <div className="space-y-3 mb-4">
              <input
                type="text"
                placeholder="Your arena name"
                value={name}
                onChange={e => { setName(e.target.value); setError('') }}
                onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }}
                className="w-full bg-[#1E293B] border border-[#334155] rounded-xl px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-blue-500/50 placeholder-[#475569]"
                autoFocus
              />
              {error && <p className="text-red-400 text-xs font-mono">{error}</p>}
            </div>

            <button
              onClick={handleSubmit}
              className="w-full py-3 rounded-xl font-display font-bold text-white transition-all hover:opacity-90 mb-4"
              style={{ background: 'linear-gradient(135deg, #1D4ED8, #3B82F6)' }}
            >
              {mode === 'register' ? 'CREATE ACCOUNT' : 'SIGN IN'}
            </button>

            <div className="text-center">
              {mode === 'register' ? (
                <button onClick={() => { setMode('login'); setError('') }} className="text-[#475569] text-xs font-mono hover:text-[#94A3B8] transition-colors">
                  Already have an account? Sign in
                </button>
              ) : (
                <button onClick={() => { setMode('register'); setError('') }} className="text-[#475569] text-xs font-mono hover:text-[#94A3B8] transition-colors">
                  New here? Create account
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
