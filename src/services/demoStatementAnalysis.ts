import type { ExtractedTransaction, PredictionResponse } from '../domain/types'
import { createDemoPrediction } from '../data/demoMetrics'

/**
 * Frontend-only analysis boundary for the review demonstration.
 * A future production adapter can replace this module without changing pages.
 */
export async function analyzeTransaction(transaction: ExtractedTransaction): Promise<PredictionResponse> {
  return createDemoPrediction(transaction)
}
