import type { AnalysisResult, ExtractedTransaction, PredictionResponse, StatementAnalysis, AnalysisSummary, TransactionInput } from '../domain/types'
import { createDemoPrediction } from '../data/demoMetrics'
import { fraudApi } from './fraudApi'
import { createStoredTransaction, savePrediction } from './transactionHistory'

export const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true'

type ProgressHandler = (completed: number, total: number) => void

export async function analyzeStatementTransactions(statementName: string, rows: ExtractedTransaction[], onProgress?: ProgressHandler): Promise<StatementAnalysis> {
  const analysisId = `analysis-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const transactions: AnalysisResult[] = []
  let usedDemoFallback = DEMO_MODE

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index]
    let response: PredictionResponse
    try {
      response = DEMO_MODE ? createDemoPrediction(row) : await fraudApi.predict(toPredictionInput(row))
    } catch {
      usedDemoFallback = true
      response = createDemoPrediction(row)
    }
    const stored = createStoredTransaction(toPredictionInput(row), response)
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
    extraction_mode: usedDemoFallback ? 'demo' : 'pdf',
    extraction_note: usedDemoFallback ? 'Some or all results use clearly labeled frontend demo predictions because the FastAPI model was unavailable or demo mode was enabled.' : undefined,
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
