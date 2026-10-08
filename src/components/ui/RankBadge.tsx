import { RankTier, getRankColor } from '../../lib/types'

interface Props { rank: RankTier; size?: 'sm' | 'md' | 'lg' }

export function RankBadge({ rank, size = 'sm' }: Props) {
  const color = getRankColor(rank)
  const sz = size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : size === 'md' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1'
  return (
    <span
      className={`font-display font-bold rounded-full border ${sz} uppercase tracking-widest`}
      style={{ color, borderColor: color + '60', backgroundColor: color + '15' }}
    >
      {rank}
    </span>
  )
}
