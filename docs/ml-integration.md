# ML integration contract

Sentinel uses the saved FastAPI fraud detection pipeline. The frontend does not retrain, recreate preprocessing, or send engineered/history fields.

## Runtime flow

1. The user enters the eight fields available at transaction time.
2. React validates the form and sends the exact JSON payload to `POST /predict`.
3. FastAPI validates the request, derives timestamp features, and runs the saved Random Forest pipeline.
4. FastAPI returns the prediction, fraud flag, probability, and decision threshold.
5. The browser stores successful predictions in local history for this application demo.

## Prediction fields

The request contains only:

- `amount`
- `merchant_category`
- `location`
- `device_type`
- `user_age`
- `account_age_days`
- `is_foreign_transaction`
- `timestamp`

The response contains:

```json
{
  "prediction": "genuine",
  "is_fraud": 0,
  "fraud_probability": 0.12,
  "probability": 0.12,
  "threshold": 0.65
}
```

`potential_fraud` means the returned probability crossed the selected threshold; it is not proof of fraud. `transaction_id`, `user_id`, `risk_score`, and historical behavior fields are not sent to the estimator.

## Runtime configuration

Set `VITE_API_BASE_URL` to the FastAPI origin. The frontend uses only `GET /health` and `POST /predict`; there are no dashboard or transaction-history backend endpoints.

Browser history is a client-side convenience for this academic demonstration. It is not a shared transaction database, bank audit trail, or production persistence layer.
