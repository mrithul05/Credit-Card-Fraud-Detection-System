import { ArrowUpRight, MapPin, TriangleAlert } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { AnalysisResult } from '../../domain/types'
import { formatCurrency, formatProbability } from '../transactions/transactionFormatters'
import { StatusBadge } from '../ui/StatusBadge'

export function FraudSignalsList({ transactions }: { transactions: AnalysisResult[] }) {
  const signals = transactions.filter((transaction) => transaction.response?.is_fraud === 1)
  return <section className="panel"><div className="panel__heading"><div><p className="eyebrow">Review queue</p><h2>Transactions requiring review</h2></div><span className="panel-note">{signals.length} potential signal{signals.length === 1 ? '' : 's'}</span></div>{signals.length ? <div className="fraud-signal-list">{signals.map((transaction) => <article className="fraud-signal" key={transaction.transaction_id}><span className="fraud-signal__icon"><TriangleAlert size={18} /></span><div className="fraud-signal__main"><div><strong>{transaction.description}</strong><span>{transaction.merchant_category} · <MapPin size={12} /> {transaction.location}</span></div><div className="fraud-signal__amount"><strong>{formatCurrency(transaction.amount)}</strong><span>{formatProbability(transaction.response?.fraud_probability || 0)} fraud probability</span></div></div><StatusBadge prediction="potential_fraud" /><Link className="icon-link" to={`/transactions/${transaction.transaction_id}`} aria-label={`View details for ${transaction.description}`}><ArrowUpRight size={17} /></Link></article>)}</div> : <div className="success-empty"><span><TriangleAlert size={18} /></span><div><strong>No transactions requiring review</strong><p>No transactions in this statement were highlighted for review.</p></div></div>}</section>
}
