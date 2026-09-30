import type { LucideIcon } from 'lucide-react'

type StatCardProps = {
  label: string
  value: string
  helper: string
  icon: LucideIcon
  tone?: 'neutral' | 'positive' | 'warning' | 'accent'
}

export function StatCard({ label, value, helper, icon: Icon, tone = 'neutral' }: StatCardProps) {
  return (
    <article className={`stat-card stat-card--${tone}`}>
      <div className="stat-card__topline">
        <span className="stat-card__label">{label}</span>
        <span className="stat-card__icon"><Icon size={18} aria-hidden="true" /></span>
      </div>
      <strong className="stat-card__value">{value}</strong>
      <span className="stat-card__helper">{helper}</span>
    </article>
  )
}
