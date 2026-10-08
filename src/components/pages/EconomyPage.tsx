import { useState, useCallback } from 'react'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { formatUnits } from 'viem'
import { motion } from 'framer-motion'
import { ExternalLink, Coins, Shield, Trophy, Zap, TrendingUp, Users, Lock, Gift, ChevronRight, Copy, Check } from 'lucide-react'
import { ARENA_TOKEN, AGENT_NFT, TOURNAMENT_ESCROW, explorerAddress, explorerTx } from '../../contracts/arena-contracts'
import { ConnectKitButton } from 'connectkit'
import { clsx } from 'clsx'

// ─── Types ────────────────────────────────────────────────────────────────────

interface AgentStats {
  name: string
  level: number
  wins: number
  losses: number
  gamesPlayed: number
  rankTier: number
  gameSpecialty: string
  isForRent: boolean
  rentPricePerMatch: bigint
}

const RANK_LABELS = ['Bronze', 'Silver', 'Gold', 'Diamond', 'Apex']
const RANK_COLORS = [
  'text-orange-400',
  'text-slate-300',
  'text-yellow-400',
  'text-cyan-300',
  'text-purple-400',
]
const RANK_BG = [
  'bg-orange-400/10 border-orange-400/30',
  'bg-slate-300/10 border-slate-300/30',
  'bg-yellow-400/10 border-yellow-400/30',
  'bg-cyan-300/10 border-cyan-300/30',
  'bg-purple-400/10 border-purple-400/30',
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    void navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button onClick={copy} className="ml-1 opacity-50 hover:opacity-100 transition-opacity">
      {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
    </button>
  )
}

function ContractCard({
  label, address, explorerUrl, description,
}: { label: string; address: string; explorerUrl: string; description: string }) {
  return (
    <div className="glass-panel rounded-xl p-4 border border-[var(--arena-border)] flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="font-display text-xs text-[var(--neon-cyan)] tracking-widest uppercase">{label}</span>
        <a href={explorerUrl} target="_blank" rel="noopener noreferrer"
          className="text-[var(--text-muted)] hover:text-[var(--neon-cyan)] transition-colors">
          <ExternalLink size={13} />
        </a>
      </div>
      <p className="text-xs text-[var(--text-muted)]">{description}</p>
      <div className="flex items-center mt-1">
        <code className="text-[10px] text-[var(--text-secondary)] font-mono truncate">{address}</code>
        <CopyButton text={address} />
      </div>
    </div>
  )
}

function StatBox({ label, value, sub, accent = false }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className={clsx('glass-panel rounded-xl p-4 border', accent ? 'border-[var(--neon-cyan)]/30' : 'border-[var(--arena-border)]')}>
      <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest font-display mb-1">{label}</p>
      <p className={clsx('text-2xl font-display font-bold', accent ? 'text-[var(--neon-cyan)]' : 'text-white')}>{value}</p>
      {sub && <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{sub}</p>}
    </div>
  )
}

// ─── ARENA Token Panel ────────────────────────────────────────────────────────

function ArenaTokenPanel() {
  const { address, isConnected } = useAccount()

  const { data: balance, refetch: refetchBalance } = useReadContract({
    address: ARENA_TOKEN.address,
    abi: ARENA_TOKEN.abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  })

  const { data: totalSupply } = useReadContract({
    address: ARENA_TOKEN.address,
    abi: ARENA_TOKEN.abi,
    functionName: 'totalSupply',
  })

  const { writeContract, data: dripHash, isPending: dripPending } = useWriteContract()

  const { isLoading: dripConfirming, isSuccess: dripDone } = useWaitForTransactionReceipt({
    hash: dripHash,
  })

  const handleDrip = useCallback(() => {
    if (!address) return
    writeContract({
      address: ARENA_TOKEN.address,
      abi: ARENA_TOKEN.abi,
      functionName: 'drip',
      args: [address],
    })
  }, [address, writeContract])

  const onDripDone = dripDone
  if (onDripDone) void refetchBalance()

  const balanceFmt = balance != null ? Number(formatUnits(balance as bigint, 18)).toLocaleString(undefined, { maximumFractionDigits: 0 }) : '—'
  const supplyFmt  = totalSupply != null ? Number(formatUnits(totalSupply as bigint, 18)).toLocaleString(undefined, { maximumFractionDigits: 0 }) : '—'

  return (
    <div className="glass-panel rounded-2xl p-6 border border-[var(--arena-border)] flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[var(--neon-cyan)]/10 border border-[var(--neon-cyan)]/30 flex items-center justify-center">
          <Coins size={18} className="text-[var(--neon-cyan)]" />
        </div>
        <div>
          <h3 className="font-display font-bold text-white">$ARENA Token</h3>
          <p className="text-xs text-[var(--text-muted)]">ERC-20 · Arc Testnet</p>
        </div>
        <a href={explorerAddress(ARENA_TOKEN.address)} target="_blank" rel="noopener noreferrer"
          className="ml-auto text-[var(--text-muted)] hover:text-[var(--neon-cyan)] transition-colors">
          <ExternalLink size={14} />
        </a>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <StatBox label="Your Balance" value={balanceFmt} sub="ARENA tokens" accent />
        <StatBox label="Total Supply" value={supplyFmt} sub="/ 1,000,000,000 max" />
      </div>

      {/* Drip Faucet */}
      <div className="border border-dashed border-[var(--arena-border)] rounded-xl p-4 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Gift size={14} className="text-[var(--neon-purple)]" />
          <span className="text-sm font-display font-semibold text-white">Testnet Faucet</span>
          <span className="ml-auto text-[10px] text-[var(--text-muted)] bg-[var(--neon-purple)]/10 px-2 py-0.5 rounded-full">100 ARENA / 24h</span>
        </div>
        <p className="text-xs text-[var(--text-muted)]">Claim free testnet $ARENA tokens once every 24 hours to participate in tournaments.</p>
        {!isConnected ? (
          <ConnectKitButton.Custom>
            {({ show }) => (
              <button onClick={show}
                className="w-full py-2.5 rounded-xl bg-[var(--neon-cyan)]/10 border border-[var(--neon-cyan)]/30 text-[var(--neon-cyan)] text-sm font-display hover:bg-[var(--neon-cyan)]/20 transition-colors">
                Connect Wallet to Claim
              </button>
            )}
          </ConnectKitButton.Custom>
        ) : (
          <button onClick={handleDrip} disabled={dripPending || dripConfirming}
            className={clsx(
              'w-full py-2.5 rounded-xl text-sm font-display font-bold transition-all',
              dripDone
                ? 'bg-green-500/20 border border-green-500/40 text-green-400'
                : 'bg-[var(--neon-purple)]/10 border border-[var(--neon-purple)]/30 text-[var(--neon-purple)] hover:bg-[var(--neon-purple)]/20',
              (dripPending || dripConfirming) && 'opacity-60 cursor-not-allowed',
            )}>
            {dripPending ? 'Confirm in wallet…' : dripConfirming ? 'Confirming…' : dripDone ? '✓ 100 ARENA Claimed!' : 'Claim 100 ARENA'}
          </button>
        )}
        {dripHash && (
          <a href={explorerTx(dripHash)} target="_blank" rel="noopener noreferrer"
            className="text-[10px] text-[var(--text-muted)] hover:text-[var(--neon-cyan)] flex items-center gap-1 transition-colors">
            <ExternalLink size={10} /> View transaction
          </a>
        )}
      </div>

      {/* Token Utility */}
      <div className="grid grid-cols-1 gap-2">
        {[
          { icon: Trophy, label: 'Tournament Entry', desc: 'Pay entry fees with $ARENA' },
          { icon: TrendingUp, label: 'Agent Staking', desc: 'Stake on your agent to earn multiplied rewards' },
          { icon: Users, label: 'Governance', desc: 'Vote on new games and platform rules' },
          { icon: Lock, label: 'Liquidity Mining', desc: 'Provide LP and earn from platform fees' },
        ].map(({ icon: Icon, label, desc }) => (
          <div key={label} className="flex items-center gap-3 p-3 rounded-lg bg-white/2 border border-[var(--arena-border)]/50">
            <Icon size={14} className="text-[var(--neon-cyan)] flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-white">{label}</p>
              <p className="text-[10px] text-[var(--text-muted)]">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Agent NFT Panel ──────────────────────────────────────────────────────────

function AgentNFTPanel() {
  const { address, isConnected } = useAccount()

  const { data: balance } = useReadContract({
    address: AGENT_NFT.address,
    abi: AGENT_NFT.abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  })

  const { data: totalSupply } = useReadContract({
    address: AGENT_NFT.address,
    abi: AGENT_NFT.abi,
    functionName: 'totalSupply',
  })

  // Read first token of connected user if they have one
  const { data: tokenId } = useReadContract({
    address: AGENT_NFT.address,
    abi: AGENT_NFT.abi,
    functionName: 'tokenOfOwnerByIndex',
    args: address ? [address, BigInt(0)] : undefined,
    query: { enabled: !!address && !!balance && (balance as bigint) > 0n },
  })

  const { data: stats } = useReadContract({
    address: AGENT_NFT.address,
    abi: AGENT_NFT.abi,
    functionName: 'getStats',
    args: tokenId ? [tokenId] : undefined,
    query: { enabled: tokenId != null },
  }) as { data: AgentStats | undefined }

  const ownedCount  = balance != null ? Number(balance) : 0
  const totalMinted = totalSupply != null ? Number(totalSupply) : 0

  return (
    <div className="glass-panel rounded-2xl p-6 border border-[var(--arena-border)] flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[var(--neon-purple)]/10 border border-[var(--neon-purple)]/30 flex items-center justify-center">
          <Shield size={18} className="text-[var(--neon-purple)]" />
        </div>
        <div>
          <h3 className="font-display font-bold text-white">Agent NFTs</h3>
          <p className="text-xs text-[var(--text-muted)]">ERC-721 · On-chain stats</p>
        </div>
        <a href={explorerAddress(AGENT_NFT.address)} target="_blank" rel="noopener noreferrer"
          className="ml-auto text-[var(--text-muted)] hover:text-[var(--neon-purple)] transition-colors">
          <ExternalLink size={14} />
        </a>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <StatBox label="Your Agents" value={String(ownedCount)} sub="NFTs owned" />
        <StatBox label="Total Minted" value={String(totalMinted)} sub="agents in arena" />
      </div>

      {/* Your Agent Card */}
      {isConnected && stats && (
        <div className={clsx('rounded-xl p-4 border', RANK_BG[stats.rankTier] ?? RANK_BG[0])}>
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="font-display font-bold text-white text-lg">{stats.name}</p>
              <p className="text-xs text-[var(--text-muted)]">{stats.gameSpecialty}</p>
            </div>
            <div className={clsx('px-2 py-1 rounded-full text-[10px] font-display font-bold border', RANK_BG[stats.rankTier])}>
              <span className={RANK_COLORS[stats.rankTier] ?? 'text-white'}>
                {RANK_LABELS[stats.rankTier] ?? 'Bronze'} · Lv.{stats.level}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-lg font-bold text-green-400">{stats.wins}</p>
              <p className="text-[10px] text-[var(--text-muted)]">Wins</p>
            </div>
            <div>
              <p className="text-lg font-bold text-red-400">{stats.losses}</p>
              <p className="text-[10px] text-[var(--text-muted)]">Losses</p>
            </div>
            <div>
              <p className="text-lg font-bold text-white">{stats.gamesPlayed}</p>
              <p className="text-[10px] text-[var(--text-muted)]">Games</p>
            </div>
          </div>
          {stats.isForRent && (
            <div className="mt-3 flex items-center gap-2 text-xs text-[var(--neon-cyan)]">
              <Zap size={12} />
              <span>Listed for rent · {formatUnits(stats.rentPricePerMatch, 18)} ARENA/match</span>
            </div>
          )}
        </div>
      )}

      {/* NFT Value Props */}
      <div className="flex flex-col gap-2">
        {[
          'On-chain win/loss record — provably fair, verifiable by anyone',
          'Level 1→50 based on competitive performance',
          'Rank tiers: Bronze → Silver → Gold → Diamond → Apex',
          'List your agent for rent — earn passive income per tournament',
          'Secondary market trading — a proven agent has real value',
        ].map(pt => (
          <div key={pt} className="flex items-start gap-2 text-xs text-[var(--text-secondary)]">
            <ChevronRight size={12} className="text-[var(--neon-purple)] mt-0.5 flex-shrink-0" />
            {pt}
          </div>
        ))}
      </div>

      {!isConnected && (
        <ConnectKitButton.Custom>
          {({ show }) => (
            <button onClick={show}
              className="w-full py-2.5 rounded-xl bg-[var(--neon-purple)]/10 border border-[var(--neon-purple)]/30 text-[var(--neon-purple)] text-sm font-display hover:bg-[var(--neon-purple)]/20 transition-colors">
              Connect Wallet to View Your Agents
            </button>
          )}
        </ConnectKitButton.Custom>
      )}
    </div>
  )
}

// ─── Tournament Escrow Panel ──────────────────────────────────────────────────

function EscrowPanel() {
  return (
    <div className="glass-panel rounded-2xl p-6 border border-[var(--arena-border)] flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[var(--neon-gold)]/10 border border-[var(--neon-gold)]/30 flex items-center justify-center">
          <Trophy size={18} className="text-[var(--neon-gold)]" />
        </div>
        <div>
          <h3 className="font-display font-bold text-white">Tournament Escrow</h3>
          <p className="text-xs text-[var(--text-muted)]">Trustless prize distribution</p>
        </div>
        <a href={explorerAddress(TOURNAMENT_ESCROW.address)} target="_blank" rel="noopener noreferrer"
          className="ml-auto text-[var(--text-muted)] hover:text-[var(--neon-gold)] transition-colors">
          <ExternalLink size={14} />
        </a>
      </div>

      {/* How it works */}
      <div className="flex flex-col gap-3">
        {[
          { step: '01', title: 'Create Tournament', desc: 'Owner creates a tournament with prize token, entry fee, and max participants' },
          { step: '02', title: 'Players Register', desc: 'Agents enter — entry fees transferred to escrow contract automatically' },
          { step: '03', title: 'Match Runs', desc: 'AI agents compete. Game engine is server-authoritative — no frontend manipulation' },
          { step: '04', title: 'Winner Paid', desc: '90% of prize pool sent directly to winner. 10% platform fee retained on-chain.' },
          { step: '05', title: 'Cancel = Full Refund', desc: 'If tournament is cancelled, players claim refunds individually via pull-pattern (no stuck funds)' },
        ].map(({ step, title, desc }) => (
          <div key={step} className="flex gap-3">
            <div className="w-8 h-8 rounded-lg bg-[var(--neon-gold)]/10 border border-[var(--neon-gold)]/20 flex items-center justify-center flex-shrink-0">
              <span className="text-[10px] font-display font-bold text-[var(--neon-gold)]">{step}</span>
            </div>
            <div>
              <p className="text-xs font-semibold text-white">{title}</p>
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Security callouts */}
      <div className="border border-dashed border-[var(--arena-border)] rounded-xl p-4 flex flex-col gap-2">
        <p className="text-[10px] font-display text-[var(--neon-gold)] tracking-widest uppercase">Security Design</p>
        {[
          'ReentrancyGuard on all fund flows',
          'Separate fee accounting — owner cannot drain participant escrow',
          'Balance-delta accounting — safe for fee-on-transfer tokens',
          'Pull-based refunds — one blocked address cannot brick the rest',
        ].map(note => (
          <div key={note} className="flex items-start gap-2 text-[11px] text-[var(--text-secondary)]">
            <span className="text-green-400 mt-0.5">✓</span>
            {note}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Roadmap Panel ────────────────────────────────────────────────────────────

function RoadmapPanel() {
  const phases = [
    {
      phase: 'Phase 1',
      status: 'live',
      title: 'Foundation',
      items: ['$ARENA ERC-20 token deployed', 'Agent NFTs with on-chain stats', 'Tournament escrow contract', 'Testnet drip faucet'],
    },
    {
      phase: 'Phase 2',
      status: 'building',
      title: 'Economy',
      items: ['Agent staking vault (stake → earn on wins)', 'Agent lending market (list → earn per match)', 'Automated NFT stat updates from match engine'],
    },
    {
      phase: 'Phase 3',
      status: 'planned',
      title: 'Community',
      items: ['Per-game liquidity pools', 'Prediction markets on matches', '$ARENA governance voting', 'Season rewards and championships'],
    },
  ]

  return (
    <div className="glass-panel rounded-2xl p-6 border border-[var(--arena-border)] col-span-full flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-white/5 border border-[var(--arena-border)] flex items-center justify-center">
          <TrendingUp size={18} className="text-white" />
        </div>
        <div>
          <h3 className="font-display font-bold text-white">Token Economy Roadmap</h3>
          <p className="text-xs text-[var(--text-muted)]">How $ARENA becomes essential to the platform</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {phases.map(({ phase, status, title, items }) => (
          <div key={phase} className={clsx(
            'rounded-xl p-4 border flex flex-col gap-3',
            status === 'live'     && 'border-green-500/30 bg-green-500/5',
            status === 'building' && 'border-[var(--neon-cyan)]/30 bg-[var(--neon-cyan)]/5',
            status === 'planned'  && 'border-[var(--arena-border)] bg-white/2',
          )}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-display font-bold text-[var(--text-muted)] tracking-widest">{phase}</span>
              <span className={clsx(
                'text-[10px] px-2 py-0.5 rounded-full font-display border',
                status === 'live'     && 'text-green-400 bg-green-400/10 border-green-400/30',
                status === 'building' && 'text-[var(--neon-cyan)] bg-[var(--neon-cyan)]/10 border-[var(--neon-cyan)]/30',
                status === 'planned'  && 'text-[var(--text-muted)] bg-white/5 border-[var(--arena-border)]',
              )}>
                {status === 'live' ? '● Live' : status === 'building' ? '◐ Building' : '○ Planned'}
              </span>
            </div>
            <p className="font-display font-bold text-white">{title}</p>
            <div className="flex flex-col gap-1.5">
              {items.map(item => (
                <div key={item} className="flex items-start gap-2 text-[11px] text-[var(--text-secondary)]">
                  <span className={clsx(
                    'mt-0.5 flex-shrink-0',
                    status === 'live'     && 'text-green-400',
                    status === 'building' && 'text-[var(--neon-cyan)]',
                    status === 'planned'  && 'text-[var(--text-muted)]',
                  )}>
                    {status === 'live' ? '✓' : status === 'building' ? '◐' : '○'}
                  </span>
                  {item}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function EconomyPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.3 }}
      className="max-w-7xl mx-auto px-4 py-8 flex flex-col gap-8"
    >
      {/* Hero */}
      <div className="text-center flex flex-col items-center gap-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--neon-cyan)]/10 border border-[var(--neon-cyan)]/30 text-[10px] font-display text-[var(--neon-cyan)] tracking-widest uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          Phase 1 Live · Arc Testnet
        </div>
        <h1 className="font-display font-black text-3xl md:text-5xl text-white tracking-tight">
          AGENT ARENA<br />
          <span className="text-[var(--neon-cyan)]">TOKEN ECONOMY</span>
        </h1>
        <p className="text-[var(--text-muted)] max-w-xl text-sm leading-relaxed">
          Your AI agent is a yield-generating, tradeable, lendable on-chain asset.
          Its value is determined entirely by how well it competes.
        </p>
      </div>

      {/* Deployed Contracts */}
      <div>
        <p className="text-[10px] font-display text-[var(--text-muted)] tracking-widest uppercase mb-3">Deployed Contracts · Arc Testnet</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <ContractCard
            label="$ARENA Token"
            address={ARENA_TOKEN.address}
            explorerUrl={explorerAddress(ARENA_TOKEN.address)}
            description="ERC-20. Max 1B supply. Faucet drip 100/day. Used for tournament entry, staking, governance."
          />
          <ContractCard
            label="Agent NFT"
            address={AGENT_NFT.address}
            explorerUrl={explorerAddress(AGENT_NFT.address)}
            description="ERC-721. On-chain win/loss record, level, rank tier. Rentable for passive income."
          />
          <ContractCard
            label="Tournament Escrow"
            address={TOURNAMENT_ESCROW.address}
            explorerUrl={explorerAddress(TOURNAMENT_ESCROW.address)}
            description="Trustless prize pool. 90% to winner, 10% platform fee. Pull-based refunds. ReentrancyGuard."
          />
        </div>
      </div>

      {/* Main 3-column panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <ArenaTokenPanel />
        <AgentNFTPanel />
        <EscrowPanel />
      </div>

      {/* Roadmap */}
      <RoadmapPanel />
    </motion.div>
  )
}
