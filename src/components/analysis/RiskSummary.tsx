import { AlertTriangle, CheckCircle2, FileCheck2, IndianRupee } from 'lucide-react'
import type { AnalysisSummary } from '../../domain/types'
import { formatCurrency } from '../transactions/transactionFormatters'
import { StatCard } from '../ui/StatCard'

export function RiskSummary({ summary }: { summary: AnalysisSummary }) {
  return <section className="stats-grid analysis-stats" aria-label="Statement analysis summary"><StatCard label="Total transactions" value={summary.total.toLocaleString('en-IN')} helper="Rows found in this statement" icon={FileCheck2} tone="accent" /><StatCard label="Analyzed" value={summary.analyzed.toLocaleString('en-IN')} helper="Selected and reviewed" icon={CheckCircle2} tone="positive" /><StatCard label="Potential fraud" value={summary.potentialFraud.toLocaleString('en-IN')} helper="Signals requiring attention" icon={AlertTriangle} tone="warning" /><StatCard label="Total spend" value={formatCurrency(summary.totalSpend)} helper={`${formatCurrency(summary.fraudAmount)} flagged for review`} icon={IndianRupee} tone="neutral" /></section>
}
