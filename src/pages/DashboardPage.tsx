import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ArrowRight, FileText, IndianRupee, ScanSearch, WalletCards } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { StatementHistoryRecord, StoredTransaction } from '../domain/types'
import { demoStatementHistory } from '../data/demoStatements'
import { getPredictionHistory, subscribeToHistory } from '../services/transactionHistory'
import { getStatementHistory, subscribeToStatementHistory } from '../services/statementHistory'
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

  return <div className="page-container"><PageHeader title="Good morning, Demo User" description="Review your statements and identify transactions that may require attention." action={<Link className="button button--primary" to="/analyze-statement">Analyze Statement <ArrowRight size={15} /></Link>} /><section className="stats-grid" aria-label="Statement review overview"><StatCard label="Statements analyzed" value={visibleStatements.length.toLocaleString('en-IN')} helper="Statements reviewed" icon={FileText} tone="accent" /><StatCard label="Transactions reviewed" value={statementTotals.transactions.toLocaleString('en-IN')} helper="Across your statements" icon={WalletCards} tone="neutral" /><StatCard label="Potential fraud" value={statementTotals.fraud.toLocaleString('en-IN')} helper="Transactions requiring attention" icon={AlertTriangle} tone="warning" /><StatCard label="Amount reviewed" value={formatCurrency(statementTotals.amount)} helper="Total transaction amount" icon={IndianRupee} tone="positive" /></section><section className="panel chart-panel"><div className="panel__heading"><div><p className="eyebrow">Risk Overview</p><h2>Statement review outcomes</h2></div></div>{statementTotals.transactions ? <RiskDistribution genuine={outcomeCounts.genuine} fraud={outcomeCounts.fraud} /> : <StateMessage type="empty" title="Ready for your first review" description="Analyze a statement to see its review outcomes here." action={<Link className="button button--secondary button--small" to="/analyze-statement">Analyze Statement</Link>} />}</section><section className="panel"><div className="panel__heading"><div><p className="eyebrow">Statement history</p><h2>Recent Statement Analyses</h2></div><Link className="text-link" to="/analyze-statement">Analyze Statement <ArrowRight size={15} /></Link></div>{visibleStatements.length ? <div className="statement-history-list">{visibleStatements.slice(0, 4).map((statement) => <article className="statement-history-row" key={statement.analysis_id}><span className="statement-history-row__icon"><FileText size={18} /></span><div><strong>{statement.statement_name}</strong><span>{statement.summary.analyzed} transactions · {statement.summary.potentialFraud} requiring attention · {formatCurrency(statement.summary.totalSpend)}</span></div><span className={`status-badge ${statement.status === 'complete' ? 'status-badge--positive' : 'status-badge--warning'}`}>{statement.status === 'complete' ? 'Completed' : 'Review'}</span><Link className="icon-link" to={statements.length ? `/analysis-results?analysis=${statement.analysis_id}` : '/analyze-statement'} aria-label={statements.length ? `View ${statement.statement_name}` : 'Analyze a statement'}><ArrowRight size={16} /></Link></article>)}</div> : <StateMessage type="empty" title="No statement history yet" description="Your completed statement analyses will appear here." />}</section><section className="panel"><div className="panel__heading"><div><p className="eyebrow">Review queue</p><h2>Transactions Requiring Attention</h2></div><Link className="text-link" to="/transactions?prediction=potential_fraud">View all <ArrowRight size={15} /></Link></div>{localSummary.potentialFraud.length ? <TransactionTable transactions={localSummary.potentialFraud.slice(0, 4)} /> : <StateMessage type="empty" title="No transactions to review" description="Transactions that may require attention will appear here after analysis." action={<Link className="button button--secondary button--small" to="/analyze-statement"><ScanSearch size={14} />Analyze Statement</Link>} />}</section></div>
}
