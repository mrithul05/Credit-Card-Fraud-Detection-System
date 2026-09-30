import { ArrowDown, ArrowUp, ArrowUpDown, ExternalLink } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Transaction } from '../../domain/types'
import { StatusBadge } from '../ui/StatusBadge'
import { formatCurrency, formatDate, formatProbability, formatTime } from './transactionFormatters'

type TransactionTableProps = {
  transactions: Transaction[]
  sortBy?: 'timestamp' | 'amount' | 'prediction'
  sortDirection?: 'asc' | 'desc'
  onSort?: (column: 'timestamp' | 'amount' | 'prediction') => void
}

export function TransactionTable({ transactions, sortBy, sortDirection, onSort }: TransactionTableProps) {
  return (
    <div className="table-wrap">
      <table className="transaction-table">
        <thead><tr>
          <th>Transaction</th>
          <SortableHeader label="Date & time" column="timestamp" sortBy={sortBy} sortDirection={sortDirection} onSort={onSort} />
          <th>Merchant</th>
          <SortableHeader label="Amount" column="amount" sortBy={sortBy} sortDirection={sortDirection} onSort={onSort} />
          <th>Location</th>
          <SortableHeader label="Prediction" column="prediction" sortBy={sortBy} sortDirection={sortDirection} onSort={onSort} />
          <th><span className="sr-only">View details</span></th>
        </tr></thead>
        <tbody>
          {transactions.map((transaction) => <tr key={transaction.transaction_id}>
            <td><Link className="transaction-id" to={`/transactions/${transaction.transaction_id}`}>{transaction.transaction_id}</Link><span className="table-subtext">{transaction.device_type} · {transaction.is_foreign_transaction ? 'Foreign' : 'Domestic'}</span></td>
            <td><span className="table-primary">{formatDate(transaction.timestamp)}</span><span className="table-subtext">{formatTime(transaction.timestamp)}</span></td>
            <td>{transaction.merchant_category}</td>
            <td className="amount-cell">{formatCurrency(transaction.amount)}</td>
            <td>{transaction.location}</td>
            <td><div className="prediction-cell"><StatusBadge prediction={transaction.is_fraud === 1 ? 'potential_fraud' : 'genuine'} /><span className="probability">{formatProbability(transaction.fraud_probability)} probability</span></div></td>
            <td><Link className="icon-link" to={`/transactions/${transaction.transaction_id}`} aria-label={`View ${transaction.transaction_id}`}><ExternalLink size={16} /></Link></td>
          </tr>)}
        </tbody>
      </table>
    </div>
  )
}

function SortableHeader({ label, column, sortBy, sortDirection, onSort }: { label: string; column: 'timestamp' | 'amount' | 'prediction'; sortBy?: string; sortDirection?: 'asc' | 'desc'; onSort?: (column: 'timestamp' | 'amount' | 'prediction') => void }) {
  const active = sortBy === column
  const Icon = active ? sortDirection === 'asc' ? ArrowUp : ArrowDown : ArrowUpDown
  return <th><button className="sort-button" onClick={() => onSort?.(column)}>{label}<Icon size={13} aria-hidden="true" /></button></th>
}

