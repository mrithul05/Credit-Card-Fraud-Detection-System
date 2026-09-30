from __future__ import annotations

import pandas as pd
import pytest

from src.preprocessing import (
    API_INPUT_FEATURES,
    CATEGORICAL_FEATURES,
    EXCLUDED_FEATURES,
    MODEL_FEATURES,
    TARGET,
    TimestampFeatureBuilder,
    validate_training_frame,
)


def payload_frame() -> pd.DataFrame:
    return pd.DataFrame(
        [
            {
                "amount": 10.0,
                "merchant_category": "Grocery",
                "location": "US",
                "timestamp": "2025-01-31 08:15:00",
                "device_type": "Mobile",
                "user_age": 35,
                "account_age_days": 100,
                "is_foreign_transaction": 0,
            },
            {
                "amount": 20.0,
                "merchant_category": "Other",
                "location": "GB",
                "timestamp": "2025-02-01 23:15:00",
                "device_type": "Desktop",
                "user_age": 45,
                "account_age_days": 200,
                "is_foreign_transaction": 1,
            },
        ]
    )


def test_timestamp_features_are_deterministic_and_prediction_time_valid():
    built = TimestampFeatureBuilder().fit_transform(payload_frame())
    assert list(built.columns) == MODEL_FEATURES
    assert built.loc[0, "hour_of_day"] == 8
    assert built.loc[0, "day_of_week"] == 4
    assert built.loc[0, "is_month_end"] == 1
    assert built.loc[1, "is_weekend"] == 1
    assert built.loc[1, "is_off_hours"] == 1
    assert "timestamp" not in built.columns
    assert set(CATEGORICAL_FEATURES).issubset(built.columns)


def test_invalid_timestamp_is_rejected():
    frame = payload_frame()
    frame.loc[0, "timestamp"] = "not-a-date"
    with pytest.raises(ValueError, match="Invalid timestamp"):
        TimestampFeatureBuilder().fit_transform(frame)


def test_training_validation_requires_binary_target():
    frame = payload_frame()
    frame[TARGET] = [0, 2]
    with pytest.raises(ValueError, match="exactly 0 and 1"):
        validate_training_frame(frame)


def test_feature_contract_excludes_target_identifiers_and_risk_score():
    assert TARGET in EXCLUDED_FEATURES
    assert "transaction_id" in EXCLUDED_FEATURES
    assert "user_id" in EXCLUDED_FEATURES
    assert "risk_score" in EXCLUDED_FEATURES
    assert not set(EXCLUDED_FEATURES).intersection(MODEL_FEATURES)
    assert set(API_INPUT_FEATURES).issuperset({"amount", "timestamp", "is_foreign_transaction"})
