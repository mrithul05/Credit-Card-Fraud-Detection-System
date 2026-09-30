/**
 * The frontend only collects values available at transaction time. Timestamp
 * features are derived by the saved backend pipeline; history-dependent fields
 * are not part of the current API contract.
 */
export const userProvidedFeatures = [
  'amount',
  'merchant_category',
  'location',
  'timestamp',
  'device_type',
  'user_age',
  'account_age_days',
  'is_foreign_transaction',
] as const

export const backendDerivedFeatures = [
  'hour_of_day',
  'day_of_week',
  'month',
  'is_weekend',
  'is_month_end',
  'is_month_start',
  'is_rush_hour',
  'is_off_hours',
] as const

export const unavailableHistoryFeatures = [
  'transaction_count_24h',
  'time_since_last_transaction',
  'transaction_count_7d',
  'transaction_count_30d',
  'amount_zscore',
  'amount_percentile',
  'amount_rolling_mean_7d',
  'amount_rolling_std_7d',
  'location_changed',
  'device_changed',
  'merchant_category_changed',
  'amount_x_transaction_count',
  'amount_x_is_foreign',
  'transaction_count_x_is_foreign',
  'avg_amount_ratio',
  'transaction_velocity',
] as const

export const identifiers = ['transaction_id', 'user_id'] as const
export const pendingRiskScoreReview = 'risk_score'
