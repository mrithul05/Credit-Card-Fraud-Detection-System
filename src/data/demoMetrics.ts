import type { AnalysisSummary, ExtractedTransaction, PredictionResponse } from '../domain/types'

const DEMO_THRESHOLD = 0.65

export function demoFraudProbability(transaction: ExtractedTransaction) {
  const amountSignal = transaction.amount >= 12000 ? 0.18 : transaction.amount >= 7000 ? 0.08 : 0
  const lateNightSignal = new Date(transaction.timestamp).getHours() < 5 ? 0.16 : 0
  const foreignSignal = transaction.is_foreign_transaction ? 0.2 : 0
  const categorySignal = transaction.merchant_category === 'Electronics' ? 0.16 : 0
  return Math.min(0.97, 0.12 + amountSignal + lateNightSignal + foreignSignal + categorySignal)
}

export function createDemoPrediction(transaction: ExtractedTransaction): PredictionResponse {
  const fraudProbability = demoFraudProbability(transaction)
  const isFraud = fraudProbability >= DEMO_THRESHOLD ? 1 : 0
  return {
    prediction: isFraud ? 'potential_fraud' : 'genuine',
    is_fraud: isFraud,
    fraud_probability: fraudProbability,
    probability: fraudProbability,
    threshold: DEMO_THRESHOLD,
  }
}

export function summarizeDemoTransactions(transactions: ExtractedTransaction[]): AnalysisSummary {
  const potentialFraud = transactions.filter((transaction) => createDemoPrediction(transaction).is_fraud === 1)
  return {
    total: transactions.length,
    analyzed: transactions.length,
    potentialFraud: potentialFraud.length,
    genuine: transactions.length - potentialFraud.length,
    totalSpend: transactions.reduce((total, transaction) => total + transaction.amount, 0),
    fraudAmount: potentialFraud.reduce((total, transaction) => total + transaction.amount, 0),
  }
}
