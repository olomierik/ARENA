import { useSyncExternalStore, useState, useEffect } from 'react'
import { ConnectKitButton } from 'connectkit'
import { useAccount, useReadContract } from 'wagmi'
import { erc20Abi } from 'viem'

import { ExternalLink, Lock, TrendingUp, Info } from 'lucide-react'
import { getState, subscribe } from '../../lib/store'
import { getUsdc, requireChain } from '../../onchain-facts'
import { Amount, usdcDecimalsFor } from '../../onchain-money'
import { ArenaAmount, ArenaIcon } from '../ui/ArenaToken'

function useStore() { return useSyncExternalStore(subscribe, getState) }

const ARC_TESTNET_ID = 5042002

export function WalletPage() {
  const store = useStore()
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(id)
  }, [])
  const { address, isConnected, chainId } = useAccount()
  const usdcFact = getUsdc(ARC_TESTNET_ID)

  const { data: usdcRaw } = useReadContract(
    isConnected && address && usdcFact
      ? {
          address: usdcFact.address as `0x${string}`,
          abi: erc20Abi,
          functionName: 'balanceOf',
          args: [address],
          chainId: ARC_TESTNET_ID,
        }
      : undefined
  )

  const usdcBalance = usdcRaw
    ? Amount.fromRaw(usdcRaw, usdcDecimalsFor(ARC_TESTNET_ID)).toFixed(2)
    : '—'

  const chain = (() => { try { return requireChain(ARC_TESTNET_ID) } catch { return null } })()
  const myStakes = store.stakes.filter(s => s.playerId === store.currentPlayer?.id)
  const totalStaked = myStakes.reduce((acc, s) => acc + s.amount, 0)

  return (
    <div className="min-h-dvh bg-[#020817] px-4 py-8">
      <div className="max-w-lg mx-auto space-y-4">
        <div>
          <h1 className="text-2xl font-display font-black text-white" style={{ letterSpacing: '-0.02em' }}>WALLET</h1>
          <p className="text-[#475569] text-xs font-mono mt-0.5">Arc Testnet · Test USDC only</p>
        </div>

        {/* Connect */}
        <div className="rounded-2xl border border-[#1E293B] bg-[#0F172A] p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[#94A3B8] text-sm font-display font-semibold">EVM Wallet</span>
            <ConnectKitButton />
          </div>

          {isConnected && address ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-[#1E293B]">
                <span className="text-[#475569] text-xs font-mono">Address</span>
                <span className="text-[#94A3B8] font-mono text-xs">{address.slice(0, 8)}...{address.slice(-6)}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-[#1E293B]">
                <span className="text-[#475569] text-xs font-mono">Network</span>
                <span className={`text-xs font-mono ${chainId === ARC_TESTNET_ID ? 'text-green-400' : 'text-yellow-400'}`}>
                  {chainId === ARC_TESTNET_ID ? 'Arc Testnet' : `Chain ${chainId} (switch to Arc)`}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-[#475569] text-xs font-mono">USDC Balance</span>
                <span className="text-white font-mono font-bold">{usdcBalance} USDC</span>
              </div>
            </div>
          ) : (
            <p className="text-[#334155] text-xs font-mono text-center py-4">
              Connect your wallet to see your on-chain USDC balance
            </p>
          )}
        </div>

        {/* $ARENA balance */}
        <div className="rounded-2xl border border-[#1E3A5F] bg-[#0A1628] p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[#94A3B8] text-sm font-display font-semibold">$ARENA Balance</span>
            <Info size={14} className="text-[#334155]" />
          </div>
          <ArenaAmount amount={store.arenaBalance} size="lg" />
          <p className="text-[#334155] text-xs font-mono mt-2">Testnet token. Earned from wins, spent on tournaments.</p>
        </div>

        {/* Staking positions */}
        <div className="rounded-2xl border border-[#1E293B] bg-[#0F172A] p-5">
          <div className="flex items-center gap-2 mb-4">
            <Lock size={14} className="text-blue-400" />
            <span className="text-[#94A3B8] text-sm font-display font-semibold">Staking</span>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-[#1E293B] mb-3">
            <span className="text-[#475569] text-xs font-mono">Total staked</span>
            <ArenaAmount amount={totalStaked} size="sm" showLabel={false} />
          </div>

          {myStakes.length === 0 ? (
            <p className="text-[#334155] text-xs font-mono text-center py-4">
              No active stakes. Join a tournament to stake $ARENA.
            </p>
          ) : (
            <div className="space-y-2">
              {myStakes.map((s, i) => {
                const t = store.tournaments.find(t => t.id === s.tournamentId)
                const locked = s.lockedUntil > now
                const hoursLeft = Math.max(0, Math.ceil((s.lockedUntil - now) / 3600000))
                return (
                  <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#0A0D14]">
                    <ArenaIcon size={14} />
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-xs font-mono truncate">{t?.name ?? 'Tournament'}</div>
                      <div className="text-[#475569] text-[10px] font-mono">
                        {locked ? `Locked ${hoursLeft}h` : 'Unlocked'} · {s.multiplier}x
                      </div>
                    </div>
                    <ArenaAmount amount={s.amount} size="sm" showLabel={false} />
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* How $ARENA works */}
        <div className="rounded-2xl border border-[#1E293B] bg-[#0F172A] p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={14} className="text-green-400" />
            <span className="text-[#94A3B8] text-sm font-display font-semibold">$ARENA Token Economy</span>
          </div>
          <div className="space-y-2 text-xs font-mono text-[#475569]">
            <div className="flex gap-2"><span className="text-green-400">+30</span><span>Win a match</span></div>
            <div className="flex gap-2"><span className="text-green-400">+55</span><span>Win a Gold-rank match</span></div>
            <div className="flex gap-2"><span className="text-green-400">+1,000</span><span>Welcome bonus</span></div>
            <div className="flex gap-2"><span className="text-yellow-400">×1.5</span><span>Stake on yourself, win tournament</span></div>
            <div className="flex gap-2"><span className="text-blue-400">-100</span><span>Tournament entry fee (varies)</span></div>
            <div className="flex gap-2"><span className="text-red-400">24h lock</span><span>Staked tokens if you lose (no permanent loss)</span></div>
          </div>
          <div className="mt-4 p-3 rounded-xl bg-[#0A1628] border border-[#1E3A5F]">
            <p className="text-[#334155] text-[10px] font-mono leading-relaxed">
              $ARENA is a testnet token. It cannot be transferred to mainnet or exchanged for real value.
              Smart contracts for escrow and staking are planned for Arc Mainnet — deployment pending audits.
            </p>
          </div>
        </div>

        {/* Explorer link */}
        {chain && (
          <a
            href={chain.explorerBase ?? '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-3 rounded-xl border border-[#1E293B] text-[#475569] hover:text-[#94A3B8] hover:border-[#334155] transition-colors text-xs font-mono"
          >
            <ExternalLink size={12} />
            View Arc Testnet Explorer
          </a>
        )}
      </div>
    </div>
  )
}
