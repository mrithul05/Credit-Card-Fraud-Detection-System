import { ShieldCheck, TriangleAlert } from 'lucide-react'
import type { Prediction } from '../../domain/types'

type StatusBadgeProps = {
  prediction?: Prediction
}

export function StatusBadge({ prediction }: StatusBadgeProps) {
  if (prediction === 'potential_fraud') {
    return <span className="status-badge status-badge--warning"><TriangleAlert size={14} aria-hidden="true" />Potential Fraud</span>
  }
  if (prediction === 'genuine') {
    return <span className="status-badge status-badge--positive"><ShieldCheck size={14} aria-hidden="true" />Genuine</span>
  }
  return <span className="status-badge status-badge--neutral">No prediction</span>
}
