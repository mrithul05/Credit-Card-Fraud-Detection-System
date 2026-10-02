import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ArrowRight, FileText, IndianRupee, ScanSearch, ShieldCheck, WalletCards } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { StatementHistoryRecord, StoredTransaction } from '../domain/types'
import { demoStatementHistory } from '../data/demoStatements'
import { getPredictionHistory, subscribeToHistory } from '../services/transactionHistory'
import { getStatementHistory, subscribeToStatementHistory } from '../services/statementHistory'
import { modelMetadata } from '../services/modelMetadata'
import { PageHeader } from '../components/ui/PageHeader'
import { StateMessage } from '../components/ui/StateMessage'
import { StatCard } from '../components/ui/StatCard'
import { RiskDistribution } from '../components/charts/RiskDistribution'
import { TransactionTable } from '../components/transactions/TransactionTable'
import { formatCurrency } from '../components/transactions/transactionFormatters'

export function DashboardPage() {
  const [transactions, setTransactions] = useState<StoredTransaction[]>(() => getPredictionHistory())
  const [statements, setStatements] = useState<StatementHistoryRecord[]>(() => getStatementHistory())

  useEffect(() => {
    const refresh = () => {
      setTransactions(getPredictionHistory())
      setStatements(getStatementHistory())
    }
    const unsubscribeHistory = subscribeToHistory(refresh)
    const unsubscribeStatements = subscribeToStatementHistory(refresh)
    return () => {
      unsubscribeHistory()
      unsubscribeStatements()
    }
  }, [])

  const visibleStatements = statements.length ? statements : demoStatementHistory
  const statementTotals = visibleStatements.reduce((total, statement) => ({
    transactions: total.transactions + statement.summary.analyzed,
    fraud: total.fraud + statement.summary.potentialFraud,
    amount: total.amount + statement.summary.totalSpend,
  }), { transactions: 0, fraud: 0, amount: 0 })
  const localSummary = useMemo(() => {
    const potentialFraud = transactions.filter((transaction) => transaction.is_fraud === 1)
    const genuine = transactions.filter((transaction) => transaction.is_fraud === 0)
    return { genuine, potentialFraud }
  }, [transactions])
  const outcomeCounts = { genuine: Math.max(0, statementTotals.transactions - statementTotals.fraud), fraud: statementTotals.fraud }

  return <div className="page-container"><PageHeader eyebrow="Workspace / overview" title="Good morning, Demo User" description="Upload a statement, review extracted transactions, and identify transactions that require attention." action={<Link className="button button--primary" to="/analyze-statement"><ScanSearch size={16} />Analyze Statement <ArrowRight size={15} /></Link>} /><div className="demo-banner"><ShieldCheck size={16} /><span><strong>Frontend demonstration mode.</strong> Synthetic statement rows and offline predictions are stored locally in this browser.</span></div><section className="stats-grid" aria-label="Statement review overview"><StatCard label="Statements analyzed" value={visibleStatements.length.toLocaleString('en-IN')} helper="Completed in this browser" icon={FileText} tone="accent" /><StatCard label="Transactions reviewed" value={statementTotals.transactions.toLocaleString('en-IN')} helper="Extracted from statements" icon={WalletCards} tone="neutral" /><StatCard label="Potential fraud" value={statementTotals.fraud.toLocaleString('en-IN')} helper="Signals requiring review" icon={AlertTriangle} tone="warning" /><StatCard label="Amount reviewed" value={formatCurrency(statementTotals.amount)} helper="Displayed in Indian Rupees" icon={IndianRupee} tone="positive" /></section><div className="dashboard-grid dashboard-grid--top"><section className="panel chart-panel"><div className="panel__heading"><div><p className="eyebrow">Risk overview</p><h2>Statement review outcomes</h2></div><span className="panel-note">Analyzed transactions</span></div>{statementTotals.transactions ? <RiskDistribution genuine={outcomeCounts.genuine} fraud={outcomeCounts.fraud} /> : <StateMessage type="empty" title="Ready for your first review" description="Analyze a statement to populate this workspace with extracted transactions and review signals." action={<Link className="button button--secondary button--small" to="/analyze-statement">Analyze Statement</Link>} />}</section><section className="panel command-panel"><span className="command-panel__icon"><ScanSearch size={21} /></span><p className="eyebrow">Recommended next step</p><h2>Analyze a statement</h2><p>Upload a credit-card statement, review the extracted transactions, and run fraud analysis.</p><Link className="button button--primary" to="/analyze-statement">Start analysis <ArrowRight size={15} /></Link><span className="panel-footnote"><ShieldCheck size={13} /> No card number, CVV, PIN, or password is required.</span></section></div><section className="panel"><div className="panel__heading"><div><p className="eyebrow">Statement history</p><h2>Recent statement analyses</h2></div><Link className="text-link" to="/analyze-statement">Upload statement <ArrowRight size={15} /></Link></div>{visibleStatements.length ? <div className="statement-history-list">{visibleStatements.slice(0, 4).map((statement) => <article className="statement-history-row" key={statement.analysis_id}><span className="statement-history-row__icon"><FileText size={18} /></span><div><strong>{statement.statement_name}</strong><span>{statement.summary.analyzed} transactions · {statement.summary.potentialFraud} potential fraud · {formatCurrency(statement.summary.totalSpend)}</span></div><span className={`status-badge ${statement.status === 'complete' ? 'status-badge--positive' : 'status-badge--warning'}`}>{statement.status === 'complete' ? 'Completed' : 'Review'}</span><Link className="icon-link" to={statements.length ? `/analysis-results?analysis=${statement.analysis_id}` : '/analyze-statement'} aria-label={statements.length ? `View ${statement.statement_name}` : 'Analyze a statement'}><ArrowRight size={16} /></Link></article>)}</div> : <StateMessage type="empty" title="No statement history yet" description="Your completed browser demo analyses will appear here." />}</section><section className="panel"><div className="panel__heading"><div><p className="eyebrow">Review queue</p><h2>Transactions requiring attention</h2></div><Link className="text-link" to="/transactions">View all <ArrowRight size={15} /></Link></div>{localSummary.potentialFraud.length ? <TransactionTable transactions={localSummary.potentialFraud.slice(0, 4)} /> : <StateMessage type="empty" title="Review signals will appear here" description="Analyze a statement to identify transactions that may require attention." />}</section><section className="dashboard-bottom-grid"><section className="panel"><div className="panel__heading"><div><p className="eyebrow">Recent activity</p><h2>Latest extracted transactions</h2></div></div>{transactions.length ? <TransactionTable transactions={transactions.slice(0, 5)} /> : <StateMessage type="empty" title="No extracted transactions yet" description="Analyze a statement to review its extracted transaction rows." action={<Link className="button button--secondary button--small" to="/analyze-statement">Analyze Statement</Link>} />}</section><section className="panel model-status-card"><div className="panel__heading"><div><p className="eyebrow">Model status</p><h2>{modelMetadata.modelName}</h2></div><span className="status-badge status-badge--positive"><ShieldCheck size={13} />Ready</span></div><p>Review signals use the saved {modelMetadata.decisionThreshold} threshold. Detailed metrics and the exact input contract are available in Model Insights.</p><div className="model-status-card__metric"><span>Decision threshold</span><strong>{Math.round(modelMetadata.decisionThreshold * 100)}%</strong></div><Link className="text-link" to="/model-information">Explore model insights <ArrowRight size={14} /></Link></section></section></div>
}
