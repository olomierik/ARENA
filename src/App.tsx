import { useState, useSyncExternalStore } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Navbar } from './components/layout/Navbar'
import { LandingPage } from './components/pages/LandingPage'
import { PlayPage } from './components/pages/PlayPage'
import { TournamentsPage } from './components/pages/TournamentsPage'
import { LeaderboardPage } from './components/pages/LeaderboardPage'
import { DashboardPage } from './components/pages/DashboardPage'
import { WalletPage } from './components/pages/WalletPage'
import { ChessPage } from './components/pages/ChessPage'
import { EconomyPage } from './components/pages/EconomyPage'
import { AuthModal } from './components/auth/AuthModal'
import { getState, subscribe, logout } from './lib/store'
import { Player } from './lib/types'

type PageId = 'home' | 'play' | 'tournaments' | 'leaderboard' | 'dashboard' | 'wallet' | 'chess' | 'economy'

function useStore() { return useSyncExternalStore(subscribe, getState) }

export default function App() {
  const store = useStore()
  const [page, setPage] = useState<PageId>('home')
  const [authOpen, setAuthOpen] = useState(false)

  function navigate(p: string) {
    setPage(p as PageId)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleAuthSuccess(_player: Player) {
    setAuthOpen(false)
    setPage('dashboard')
  }

  function handleLogin() { setAuthOpen(true) }
  function handleLogout() { logout(); setPage('home') }

  // Open auth modal at navigate time instead of via effect
  function navigateTo(p: string) {
    if (p === 'play' && !store.currentPlayer) { setAuthOpen(true); return }
    navigate(p)
  }

  const cp = store.currentPlayer

  return (
    <div className="min-h-dvh bg-[#020817] font-body">
      <Navbar
        currentPage={page}
        onNavigate={navigateTo}
        user={cp}
        onLogin={handleLogin}
        onLogout={handleLogout}
      />

      <main className="pt-14">
        <AnimatePresence mode="wait">
          <motion.div
            key={page}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {page === 'home'         && <LandingPage     onNavigate={navigate} />}
            {page === 'play'         && cp && <PlayPage />}
            {page === 'tournaments'  && <TournamentsPage />}
            {page === 'leaderboard'  && <LeaderboardPage />}
            {page === 'dashboard'    && <DashboardPage onNavigate={navigate} />}
            {page === 'wallet'       && <WalletPage />}
            {page === 'chess'        && <ChessPage />}
            {page === 'economy'      && <EconomyPage />}
          </motion.div>
        </AnimatePresence>
      </main>

      <AuthModal
        open={authOpen}
        onClose={() => { setAuthOpen(false); if (page === 'play') setPage('home') }}
        onSuccess={handleAuthSuccess}
      />
    </div>
  )
}
