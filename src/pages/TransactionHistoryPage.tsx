import { useEffect, useMemo, useState } from 'react'
import { Filter, RotateCcw, Search } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import type { StoredTransaction, TransactionPage, TransactionQuery } from '../domain/types'
import { getPredictionHistory, subscribeToHistory } from '../services/transactionHistory'
import { PageHeader } from '../components/ui/PageHeader'
import { StateMessage } from '../components/ui/StateMessage'
import { TransactionTable } from '../components/transactions/TransactionTable'

const pageSize = 6
const initialQuery: TransactionQuery = { page: 1, page_size: pageSize, sort_by: 'timestamp', sort_direction: 'desc', prediction: 'all' }

export function TransactionHistoryPage() {
  const [params] = useSearchParams()
  const suspiciousOnly = params.get('prediction') === 'potential_fraud'
  const [transactions, setTransactions] = useState<StoredTransaction[]>(() => getPredictionHistory())
  const [query, setQuery] = useState<TransactionQuery>(() => ({ ...initialQuery, prediction: suspiciousOnly ? 'potential_fraud' : 'all' }))

  useEffect(() => subscribeToHistory(() => setTransactions(getPredictionHistory())), [])
  useEffect(() => setQuery((current) => ({ ...current, prediction: suspiciousOnly ? 'potential_fraud' : current.prediction === 'potential_fraud' ? 'all' : current.prediction, page: 1 })), [suspiciousOnly])

  const categories = useMemo(() => ['all', ...new Set(transactions.map((transaction) => transaction.merchant_category).filter(Boolean))], [transactions])
  const data = useMemo(() => buildPage(transactions, query), [transactions, query])
  const totalPages = Math.max(1, Math.ceil(data.total / pageSize))

  function updateQuery(update: Partial<TransactionQuery>) {
    setQuery((current) => ({ ...current, ...update, page: update.page ?? 1 }))
  }

  function sort(column: 'timestamp' | 'amount' | 'prediction') {
    setQuery((current) => ({ ...current, sort_by: column, sort_direction: current.sort_by === column && current.sort_direction === 'desc' ? 'asc' : 'desc', page: 1 }))
  }

  function clearFilters() {
    setQuery({ ...initialQuery, prediction: suspiciousOnly ? 'potential_fraud' : 'all' })
  }

  const title = suspiciousOnly ? 'Transactions requiring review' : 'Reviewed statement transactions'
  const description = suspiciousOnly ? 'Review transactions that may require your attention.' : 'Review transactions from your analyzed statements.'
  return <div className="page-container">
    <PageHeader eyebrow="Step 05 · Review transactions" title={title} description={description} action={<span className="record-count">{data.total.toLocaleString()} transactions</span>} />
        <section className="panel filters-panel"><div className="filter-heading"><div><Filter size={18} /><strong>Find a statement transaction</strong></div><button className="button button--ghost button--small" onClick={clearFilters}><RotateCcw size={14} />Clear filters</button></div><div className="filters-grid"><label className="search-field"><span className="sr-only">Search reviewed transactions</span><Search size={16} /><input value={query.search || ''} placeholder="Search merchant, category, or location" onChange={(event) => updateQuery({ search: event.target.value })} /></label><label className="field field--compact"><span>Review status</span><select value={query.prediction} onChange={(event) => updateQuery({ prediction: event.target.value as TransactionQuery['prediction'] })}><option value="all">All statuses</option><option value="genuine">No concerns found</option><option value="potential_fraud">Potential fraud</option></select></label><label className="field field--compact"><span>Merchant category</span><select value={query.merchant_category || 'all'} onChange={(event) => updateQuery({ merchant_category: event.target.value })}>{categories.map((category) => <option key={category} value={category}>{category === 'all' ? 'All categories' : category}</option>)}</select></label></div></section>
    <section className="panel panel--flush"><div className="panel__heading panel__heading--table"><div><p className="eyebrow">Review queue</p><h2>{suspiciousOnly ? 'Suspicious transactions' : 'Statement transactions'}</h2></div><span className="panel-note">Sorted by {query.sort_by === 'timestamp' ? 'date' : query.sort_by === 'prediction' ? 'review status' : query.sort_by}</span></div>{data.items.length ? <><TransactionTable transactions={data.items} sortBy={query.sort_by} sortDirection={query.sort_direction} onSort={sort} /><Pagination page={data.page} totalPages={totalPages} onPage={(page) => setQuery((current) => ({ ...current, page }))} /></> : <StateMessage type="empty" title={transactions.length ? 'No transactions found' : 'No statement transactions yet'} description={transactions.length ? 'Try a broader search or clear one of the filters.' : 'Upload a statement to extract and review its transactions.'} action={transactions.length ? <button className="button button--secondary" onClick={clearFilters}>Clear filters</button> : <Link className="button button--secondary" to="/analyze-statement">Upload a statement</Link>} />}</section>
  </div>
}

function buildPage(transactions: StoredTransaction[], query: TransactionQuery): TransactionPage {
  let results = [...transactions]
  const search = query.search?.trim().toLowerCase()
  if (search) results = results.filter((transaction) => [transaction.merchant_name || '', transaction.merchant_category, transaction.location].some((value) => value.toLowerCase().includes(search)))
  if (query.prediction && query.prediction !== 'all') results = results.filter((transaction) => transaction.prediction === query.prediction)
  if (query.merchant_category && query.merchant_category !== 'all') results = results.filter((transaction) => transaction.merchant_category === query.merchant_category)

  const direction = query.sort_direction === 'asc' ? 1 : -1
  if (query.sort_by === 'amount') results.sort((a, b) => (a.amount - b.amount) * direction)
  else if (query.sort_by === 'prediction') results.sort((a, b) => a.prediction.localeCompare(b.prediction) * direction)
  else results.sort((a, b) => (Date.parse(a.checked_at) - Date.parse(b.checked_at)) * direction)

  const page = query.page || 1
  const size = query.page_size || pageSize
  const start = (page - 1) * size
  return { items: results.slice(start, start + size), total: results.length, page, page_size: size }
}

function Pagination({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (page: number) => void }) {
  return <div className="pagination"><span>Page {page} of {totalPages}</span><div><button className="button button--secondary button--small" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</button><button className="button button--secondary button--small" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>Next</button></div></div>
}
