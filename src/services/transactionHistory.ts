import type { PredictionResponse, StoredTransaction, TransactionInput } from '../domain/types'

const STORAGE_KEY = 'sentinel.transaction-history.v1'
const HISTORY_UPDATED_EVENT = 'sentinel:history-updated'
const MAX_HISTORY_SIZE = 500

function isStoredTransaction(value: unknown): value is StoredTransaction {
  if (!value || typeof value !== 'object') return false
  const record = value as Record<string, unknown>
  return typeof record.transaction_id === 'string'
    && typeof record.checked_at === 'string'
    && typeof record.amount === 'number'
    && typeof record.merchant_category === 'string'
    && typeof record.location === 'string'
    && typeof record.device_type === 'string'
    && typeof record.user_age === 'number'
    && typeof record.account_age_days === 'number'
    && typeof record.is_foreign_transaction === 'boolean'
    && typeof record.timestamp === 'string'
    && (record.prediction === 'genuine' || record.prediction === 'potential_fraud')
    && (record.is_fraud === 0 || record.is_fraud === 1)
    && typeof record.fraud_probability === 'number'
    && typeof record.probability === 'number'
    && typeof record.threshold === 'number'
}

export function getPredictionHistory(): StoredTransaction[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter(isStoredTransaction) : []
  } catch {
    return []
  }
}

function publishHistoryUpdate() {
  window.dispatchEvent(new Event(HISTORY_UPDATED_EVENT))
}

function createTransactionId() {
  if (typeof crypto.randomUUID === 'function') return `APP-${crypto.randomUUID()}`
  return `APP-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export function createStoredTransaction(input: TransactionInput, response: PredictionResponse): StoredTransaction {
  return {
    ...input,
    ...response,
    transaction_id: createTransactionId(),
    checked_at: new Date().toISOString(),
  }
}

export function savePrediction(transaction: StoredTransaction): void {
  try {
    const history = [transaction, ...getPredictionHistory().filter((item) => item.transaction_id !== transaction.transaction_id)]
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(0, MAX_HISTORY_SIZE)))
    publishHistoryUpdate()
  } catch {
    // A successful prediction still remains visible on the current page if storage is unavailable.
  }
}

export function getPrediction(transactionId: string): StoredTransaction | undefined {
  return getPredictionHistory().find((transaction) => transaction.transaction_id === transactionId)
}

export function subscribeToHistory(listener: () => void): () => void {
  const handleUpdate = () => listener()
  window.addEventListener(HISTORY_UPDATED_EVENT, handleUpdate)
  window.addEventListener('storage', handleUpdate)
  return () => {
    window.removeEventListener(HISTORY_UPDATED_EVENT, handleUpdate)
    window.removeEventListener('storage', handleUpdate)
  }
}
