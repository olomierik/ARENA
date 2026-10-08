interface Props { seed: string; size?: number; className?: string }

const COLORS = [
  '#3B82F6','#EF4444','#10B981','#F59E0B','#8B5CF6',
  '#EC4899','#06B6D4','#84CC16','#F97316','#6366F1',
]

export function Avatar({ seed, size = 36, className = '' }: Props) {
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) & 0xffff
  const bg  = COLORS[hash % COLORS.length]
  const bg2 = COLORS[(hash >> 4) % COLORS.length]
  const initial = seed[0]?.toUpperCase() ?? '?'

  return (
    <div
      className={`rounded-full flex items-center justify-center font-display font-black text-white shrink-0 ${className}`}
      style={{
        width: size, height: size,
        background: `linear-gradient(135deg, ${bg}, ${bg2})`,
        fontSize: size * 0.42,
      }}
    >
      {initial}
    </div>
  )
}
