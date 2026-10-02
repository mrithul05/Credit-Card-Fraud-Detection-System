import type { StatementHistoryRecord } from '../domain/types'
import { demoTransactions } from './demoTransactions'
import { summarizeDemoTransactions } from './demoMetrics'

// Optional starter records make the command center useful after a fresh demo login.
export const demoStatementHistory: StatementHistoryRecord[] = [
  {
    analysis_id: 'demo-statement-september',
    statement_name: 'September_Statement.pdf',
    uploaded_at: '2026-09-30T09:30:00.000Z',
    extraction_mode: 'demo',
    status: 'complete',
    summary: summarizeDemoTransactions(demoTransactions),
  },
]
