// $ARENA token visual components

interface TokenAmountProps {
  amount: number
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
}

export function ArenaAmount({ amount, size = 'md', showLabel = true }: TokenAmountProps) {
  const fmtSize = size === 'sm' ? 'text-xs' : size === 'md' ? 'text-sm' : 'text-xl'
  const iconSize = size === 'sm' ? 12 : size === 'md' ? 16 : 24
  return (
    <span className={`inline-flex items-center gap-1 font-mono font-bold tabular-nums ${fmtSize}`}>
      <ArenaIcon size={iconSize} />
      <span className="text-[#FBBF24]">{amount.toLocaleString()}</span>
      {showLabel && <span className="text-[#92400E] text-[0.8em]">$ARENA</span>}
    </span>
  )
}

export function ArenaIcon({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={`shrink-0 ${className}`}>
      <polygon
        points="12,2 15.5,9 23,9.5 17.5,15 19.5,22.5 12,18.5 4.5,22.5 6.5,15 1,9.5 8.5,9"
        fill="#FBBF24"
        stroke="#D97706"
        strokeWidth="1"
      />
      <text x="12" y="15" textAnchor="middle" fill="#1A1A1A" fontSize="7" fontWeight="900" fontFamily="monospace">A</text>
    </svg>
  )
}
