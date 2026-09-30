# Fraud Dataset Analysis

## Dataset
- Rows: 10000
- Columns: 37
- Shape matches expected 10,000 x 37: True
- SHA-256: `754444aaa46ca90f291d1e077089aae4772e62f9861064ddd02cebdde24dd658`
- Target values: {'0': 9500, '1': 500}
- Genuine: 9500; fraud: 500 (5.00%)

## Data quality
- Missing values: 0
- Duplicate rows: 0
- Duplicate transaction IDs: 0
- Unique users: 4317

## Timestamp review
- Range: `2024-12-28 14:08:06.244642` to `2025-12-28 12:59:05.909653`
- Parse failures: 0
- Derived columns matching the raw timestamp: {'parse_failures': 0, 'day_of_week_matches': 10000, 'month_matches': 10000, 'hour_of_day_matches': 409, 'is_weekend_matches': 5873, 'is_month_end_matches': 8571, 'is_month_start_matches': 8635}

## Leakage and feature decisions
- Retained API fields: `amount, merchant_category, location, timestamp, device_type, user_age, account_age_days, is_foreign_transaction`
- Excluded identifiers: `transaction_id, user_id`
- Excluded target: `is_fraud`
- Excluded `risk_score`: Unknown provenance and suspicious target association; not safe for prediction-time use.
- Excluded history/rolling fields: `transaction_count_24h, avg_transaction_amount, time_since_last_transaction, transaction_count_7d, transaction_count_30d, amount_zscore, amount_percentile, amount_rolling_mean_7d, amount_rolling_std_7d, location_changed, device_changed, merchant_category_changed, avg_amount_ratio, transaction_velocity`
- Excluded history-dependent interactions: `amount_x_transaction_count, amount_x_is_foreign, transaction_count_x_is_foreign`
- Rationale: The frontend supplies no transaction history, and rolling/cumulative values cannot be reconstructed as-of prediction from the API payload.

## Derived feature checks
- `amount_x_transaction_count` exact/near matches: 10000/10000 (max absolute difference 1.81899e-12)
- `amount_x_is_foreign` exact/near matches: 10000/10000 (max absolute difference 0)
- `transaction_count_x_is_foreign` exact/near matches: 10000/10000 (max absolute difference 0)

The training pipeline recomputes timestamp features from the raw timestamp rather than trusting inconsistent precomputed timestamp columns. `risk_score` is not used because its provenance cannot be established and its distribution is strongly associated with the target.
