import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, Sword } from 'lucide-react'
import { Player } from '../../lib/types'
import { Avatar } from '../ui/Avatar'
import { ArenaAmount } from '../ui/ArenaToken'
import { getState } from '../../lib/store'

type PageId = 'home' | 'play' | 'tournaments' | 'leaderboard' | 'dashboard' | 'wallet' | 'chess' | 'economy'

const NAV_ITEMS: { id: PageId; label: string }[] = [
  { id: 'play',         label: 'Play'         },
  { id: 'tournaments',  label: 'Tournaments'  },
  { id: 'chess',        label: '♟ Chess'      },
  { id: 'leaderboard',  label: 'Leaderboard'  },
  { id: 'economy',      label: '⬡ Economy'    },
]

interface Props {
  currentPage: string
  onNavigate: (page: string) => void
  user: Player | null
  onLogin: () => void
  onLogout: () => void
}

export function Navbar({ currentPage, onNavigate, user, onLogin, onLogout }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const store = getState()

  function nav(id: string) { onNavigate(id); setMobileOpen(false) }

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-40 border-b border-[#0F172A] bg-[#020817]/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">

          {/* Logo */}
          <button
            onClick={() => nav('home')}
            className="flex items-center gap-2 font-display font-black text-white hover:opacity-80 transition-opacity"
            style={{ letterSpacing: '-0.02em' }}
          >
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
              <Sword size={14} className="text-white" />
            </div>
            AGENT ARENA
          </button>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map(item => (
              <button
                key={item.id}
                onClick={() => nav(item.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-display font-semibold transition-colors ${
                  currentPage === item.id
                    ? 'bg-[#1E293B] text-white'
                    : 'text-[#475569] hover:text-[#94A3B8] hover:bg-[#0F172A]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {user ? (
              <>
                <ArenaAmount amount={store.arenaBalance} size="sm" showLabel={false} />
                <button
                  onClick={() => nav('dashboard')}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[#1E293B] transition-colors"
                >
                  <Avatar seed={user.avatarSeed} size={24} />
                  <span className="text-[#94A3B8] text-xs font-display font-semibold hidden sm:block">{user.name}</span>
                </button>
                <button
                  onClick={() => nav('wallet')}
                  className="hidden sm:block text-[#475569] text-xs font-mono hover:text-[#94A3B8] px-2 py-1.5 rounded-lg hover:bg-[#0F172A] transition-colors"
                >
                  Wallet
                </button>
                <button
                  onClick={onLogout}
                  className="hidden sm:block text-[#334155] text-xs font-mono hover:text-[#475569] transition-colors"
                >
                  Sign out
                </button>
              </>
            ) : (
              <button
                onClick={onLogin}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-display font-bold text-xs transition-colors"
              >
                SIGN IN
              </button>
            )}

            {/* Mobile menu button */}
            <button
              className="md:hidden p-1.5 rounded-lg text-[#475569] hover:bg-[#0F172A]"
              onClick={() => setMobileOpen(o => !o)}
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed top-14 left-0 right-0 z-30 bg-[#0F172A] border-b border-[#1E293B] px-4 py-3 md:hidden"
          >
            <div className="space-y-1">
              {NAV_ITEMS.map(item => (
                <button
                  key={item.id}
                  onClick={() => nav(item.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-display font-semibold transition-colors ${
                    currentPage === item.id ? 'bg-[#1E293B] text-white' : 'text-[#64748B] hover:text-white'
                  }`}
                >
                  {item.label}
                </button>
              ))}
              {user && (
                <>
                  <button onClick={() => nav('wallet')} className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-display font-semibold text-[#64748B] hover:text-white">Wallet</button>
                  <button onClick={() => { onLogout(); setMobileOpen(false) }} className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-mono text-[#334155] hover:text-[#64748B]">Sign out</button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
