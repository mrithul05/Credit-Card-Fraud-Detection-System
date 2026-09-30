import type { BackendHealth, PredictionResponse, TransactionInput } from '../domain/types'
import { ApiError, requestJson } from './apiClient'

type RawRecord = Record<string, unknown>

export type FraudApi = {
  health: () => Promise<BackendHealth>
  predict: (input: TransactionInput) => Promise<PredictionResponse>
}

function asRecord(value: unknown, message: string): RawRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new ApiError(message)
  }
  return value as RawRecord
}

function finiteNumber(record: RawRecord, key: string): number {
  const value = record[key]
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new ApiError(`The backend response is missing a valid ${key}.`)
  }
  return value
}

function parsePredictionResponse(value: unknown): PredictionResponse {
  const record = asRecord(value, 'The backend returned an invalid prediction response.')
  const prediction = record.prediction
  if (prediction !== 'genuine' && prediction !== 'potential_fraud') {
    throw new ApiError('The backend response did not include a supported prediction.')
  }
  const isFraud = record.is_fraud
  if (isFraud !== 0 && isFraud !== 1) {
    throw new ApiError('The backend response did not include a valid fraud flag.')
  }
  const fraudProbability = finiteNumber(record, 'fraud_probability')
  const probability = finiteNumber(record, 'probability')
  const threshold = finiteNumber(record, 'threshold')
  if (fraudProbability < 0 || fraudProbability > 1 || probability < 0 || probability > 1 || threshold < 0 || threshold > 1) {
    throw new ApiError('The backend response included an invalid probability or threshold.')
  }
  return {
    prediction,
    is_fraud: isFraud,
    fraud_probability: fraudProbability,
    probability,
    threshold,
  }
}

function parseHealth(value: unknown): BackendHealth {
  const record = asRecord(value, 'The health endpoint returned an invalid response.')
  if (record.status !== 'ok' && record.status !== 'model_unavailable') {
    throw new ApiError('The health endpoint returned an unsupported status.')
  }
  return {
    status: record.status,
    model_loaded: typeof record.model_loaded === 'boolean' ? record.model_loaded : undefined,
    detail: typeof record.detail === 'string' ? record.detail : undefined,
  }
}

export const fraudApi: FraudApi = {
  async health() {
    return parseHealth(await requestJson<unknown>('/health'))
  },

  async predict(input) {
    const response = await requestJson<unknown>('/predict', {
      method: 'POST',
      body: JSON.stringify(input),
    })
    return parsePredictionResponse(response)
  },
}
