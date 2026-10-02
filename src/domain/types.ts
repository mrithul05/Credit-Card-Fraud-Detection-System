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

export type DemoUser = {
  name: string
  email: string
}

export type ExtractedTransaction = TransactionInput & {
  extraction_id: string
  description: string
  statement_date: string
  extraction_confidence: 'high' | 'medium' | 'demo'
  selected: boolean
  source: 'pdf' | 'demo'
}

export type AnalysisResult = ExtractedTransaction & {
  transaction_id: string
  response?: PredictionResponse
  analysis_status: 'analyzed' | 'error'
  analysis_error?: string
}

export type AnalysisSummary = {
  total: number
  analyzed: number
  potentialFraud: number
  genuine: number
  totalSpend: number
  fraudAmount: number
}

export type StatementAnalysis = {
  analysis_id: string
  statement_name: string
  uploaded_at: string
  extraction_mode: 'pdf' | 'demo'
  extraction_note?: string
  transactions: AnalysisResult[]
  summary: AnalysisSummary
  status: 'complete' | 'partial' | 'error'
}

export type StatementHistoryRecord = Pick<StatementAnalysis, 'analysis_id' | 'statement_name' | 'uploaded_at' | 'summary' | 'status' | 'extraction_mode'>

export type AnalysisWorkflow = 'upload' | 'extracting' | 'review' | 'analyzing' | 'complete' | 'error'
