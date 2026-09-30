export type Prediction = 'genuine' | 'potential_fraud'

export type TransactionInput = {
  amount: number
  merchant_category: string
  location: string
  device_type: string
  user_age: number
  account_age_days: number
  is_foreign_transaction: boolean
  timestamp: string
}

export type PredictionResponse = {
  prediction: Prediction
  is_fraud: 0 | 1
  fraud_probability: number
  probability: number
  threshold: number
}

export type StoredTransaction = TransactionInput & PredictionResponse & {
  transaction_id: string
  checked_at: string
}

export type Transaction = StoredTransaction

export type BackendHealth = {
  status: 'ok' | 'model_unavailable'
  model_loaded?: boolean
  detail?: string
}

export type TransactionQuery = {
  search?: string
  prediction?: 'all' | Prediction
  merchant_category?: string
  sort_by?: 'timestamp' | 'amount' | 'prediction'
  sort_direction?: 'asc' | 'desc'
  page?: number
  page_size?: number
}

export type TransactionPage = {
  items: Transaction[]
  total: number
  page: number
  page_size: number
}
