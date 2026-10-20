import type { LucideIcon } from 'lucide-react'

interface Props {
  label: string
  value: string | number
  icon: LucideIcon
  accent: string
  wide?: boolean
}

export function StatCard({ label, value, icon: Icon, accent, wide }: Props) {
  return (
    <div className={`card stat-card${wide ? ' wide' : ''}`}>
      <div className="stat-label">
        <Icon size={20} color={accent} />
        <span>{label}</span>
      </div>
      <div className="stat-value">{value}</div>
    </div>
  )
}
