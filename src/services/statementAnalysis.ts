import type { AnalysisResult, ExtractedTransaction, PredictionResponse, StatementAnalysis, AnalysisSummary, TransactionInput } from '../domain/types'
import { analyzeTransaction } from './demoStatementAnalysis'
import { createStoredTransaction, savePrediction } from './transactionHistory'

type ProgressHandler = (completed: number, total: number) => void

export async function analyzeStatementTransactions(statementName: string, rows: ExtractedTransaction[], onProgress?: ProgressHandler): Promise<StatementAnalysis> {
  const analysisId = `analysis-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const transactions: AnalysisResult[] = []
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index]
    const response: PredictionResponse = await analyzeTransaction(row)
    const stored = createStoredTransaction(toPredictionInput(row), response, row.description)
    savePrediction(stored)
    transactions.push({ ...row, transaction_id: stored.transaction_id, response, analysis_status: 'analyzed' })
    onProgress?.(index + 1, rows.length)
    await wait(120)
  }

  const summary = summarize(transactions)
  return {
    analysis_id: analysisId,
    statement_name: statementName,
    uploaded_at: new Date().toISOString(),
    extraction_mode: rows.some((row) => row.source === 'demo') ? 'demo' : 'pdf',
    extraction_note: rows.some((row) => row.source === 'demo') ? 'Sample transactions are being used to demonstrate the browser-based review workflow.' : 'Transactions were analyzed with the frontend demonstration risk-signal service.',
    transactions,
    summary,
    status: 'complete',
  }
}

export function summarize(transactions: AnalysisResult[]): AnalysisSummary {
  const analyzed = transactions.filter((transaction) => transaction.analysis_status === 'analyzed')
  const potentialFraud = analyzed.filter((transaction) => transaction.response?.is_fraud === 1)
  return {
    total: transactions.length,
    analyzed: analyzed.length,
    potentialFraud: potentialFraud.length,
    genuine: analyzed.length - potentialFraud.length,
    totalSpend: analyzed.reduce((total, transaction) => total + transaction.amount, 0),
    fraudAmount: potentialFraud.reduce((total, transaction) => total + transaction.amount, 0),
  }
}

function toPredictionInput(row: ExtractedTransaction): TransactionInput {
  return {
    amount: row.amount,
    merchant_category: row.merchant_category,
    location: row.location,
    device_type: row.device_type,
    user_age: row.user_age,
    account_age_days: row.account_age_days,
    is_foreign_transaction: row.is_foreign_transaction,
    timestamp: row.timestamp,
  }
}

function wait(milliseconds: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds))
}
