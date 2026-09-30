import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ArrowRight, CircleDollarSign, Percent, ShieldCheck, WalletCards } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { StoredTransaction } from '../domain/types'
import { getPredictionHistory, subscribeToHistory } from '../services/transactionHistory'
import { modelMetadata } from '../services/modelMetadata'
import { PageHeader } from '../components/ui/PageHeader'
import { StateMessage } from '../components/ui/StateMessage'
import { StatCard } from '../components/ui/StatCard'
import { RiskDistribution } from '../components/charts/RiskDistribution'
import { TransactionTable } from '../components/transactions/TransactionTable'

export function DashboardPage() {
  const [transactions, setTransactions] = useState<StoredTransaction[]>(() => getPredictionHistory())

  useEffect(() => subscribeToHistory(() => setTransactions(getPredictionHistory())), [])

  const summary = useMemo(() => {
    const potentialFraud = transactions.filter((transaction) => transaction.is_fraud === 1)
    const genuine = transactions.filter((transaction) => transaction.is_fraud === 0)
    return {
      total: transactions.length,
      genuine,
      potentialFraud,
      fraudPercentage: transactions.length ? (potentialFraud.length / transactions.length) * 100 : 0,
    }
  }, [transactions])

  return <div className="page-container">
    <PageHeader eyebrow="Overview" title="Fraud detection dashboard" description="Review predictions made through this browser and keep the model's dataset statistics separate from local activity." action={<Link className="button button--primary" to="/check-transaction">Check a transaction <ArrowRight size={16} /></Link>} />
    <section className="stats-grid" aria-label="Local prediction summary">
      <StatCard label="Checks in this browser" value={summary.total.toLocaleString()} helper="Successful predictions saved locally" icon={WalletCards} tone="accent" />
      <StatCard label="Genuine checks" value={summary.genuine.length.toLocaleString()} helper="Local model results" icon={ShieldCheck} tone="positive" />
      <StatCard label="Potential fraud signals" value={summary.potentialFraud.length.toLocaleString()} helper="Signals requiring review" icon={AlertTriangle} tone="warning" />
      <StatCard label="Fraud signal rate" value={`${summary.fraudPercentage.toFixed(1)}%`} helper="Among local predictions" icon={Percent} tone="neutral" />
    </section>

    <section className="dashboard-grid dashboard-grid--top">
      <article className="panel chart-panel"><div className="panel__heading"><div><p className="eyebrow">Local checks</p><h2>Prediction outcomes</h2></div><span className="panel-note">Browser history only</span></div>{summary.total ? <RiskDistribution genuine={summary.genuine.length} fraud={summary.potentialFraud.length} /> : <StateMessage type="empty" title="No predictions yet" description="Check a transaction to populate this dashboard with real model responses." action={<Link className="button button--secondary button--small" to="/check-transaction">Check a transaction</Link>} />}</article>
      <article className="panel callout-panel"><div className="callout-icon"><CircleDollarSign size={20} /></div><p className="eyebrow">Review focus</p><h2>Potential fraud is a model signal</h2><p>Use the prediction to prioritize investigation. It is not confirmation that a transaction is fraudulent.</p><Link className="text-link" to="/transactions">Open transaction history <ArrowRight size={15} /></Link></article>
    </section>

    <section className="panel"><div className="panel__heading"><div><p className="eyebrow">Dataset statistics</p><h2>Training dataset overview</h2></div><span className="panel-note">Not live production data</span></div><div className="dataset-metrics"><div><span>Total transactions</span><strong>{modelMetadata.dataset.total.toLocaleString()}</strong></div><div><span>Genuine</span><strong>{modelMetadata.dataset.genuine.toLocaleString()}</strong></div><div><span>Fraud labels</span><strong>{modelMetadata.dataset.fraud.toLocaleString()}</strong></div><div><span>Fraud percentage</span><strong>{modelMetadata.dataset.fraudPercentage}%</strong></div><div><span>Model</span><strong>{modelMetadata.modelName}</strong></div><div><span>Decision threshold</span><strong>{modelMetadata.decisionThreshold}</strong></div></div><p className="panel-footnote">These are the finalized dataset and test-evaluation context used for the academic model, not current transaction activity.</p></section>

    <section className="panel"><div className="panel__heading"><div><p className="eyebrow">Latest checks</p><h2>Recent transaction predictions</h2></div><Link className="text-link" to="/transactions">View all <ArrowRight size={15} /></Link></div>{transactions.length ? <TransactionTable transactions={transactions.slice(0, 6)} /> : <StateMessage type="empty" title="No predictions yet" description="Your successful predictions will appear here." />}</section>
    <section className="panel"><div className="panel__heading"><div><p className="eyebrow">Prioritize review</p><h2>Recent potential fraud signals</h2></div><span className="panel-note">Local predictions</span></div>{summary.potentialFraud.length ? <TransactionTable transactions={summary.potentialFraud.slice(0, 4)} /> : <StateMessage type="empty" title="No potential fraud signals" description="No locally saved prediction has crossed the decision threshold." />}</section>
  </div>
}
