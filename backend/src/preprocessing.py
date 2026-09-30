"""Feature contract and leakage-safe preprocessing for fraud detection."""

from __future__ import annotations

from typing import Iterable

import numpy as np
import pandas as pd
from sklearn.base import BaseEstimator, TransformerMixin
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

TARGET = "is_fraud"
IDENTIFIERS = ["transaction_id", "user_id"]
RISK_SCORE = "risk_score"

API_INPUT_FEATURES = [
    "amount",
    "merchant_category",
    "location",
    "timestamp",
    "device_type",
    "user_age",
    "account_age_days",
    "is_foreign_transaction",
]

RAW_NUMERICAL_FEATURES = [
    "amount",
    "user_age",
    "account_age_days",
    "is_foreign_transaction",
]
RAW_CATEGORICAL_FEATURES = ["merchant_category", "location", "device_type"]
TIMESTAMP_FEATURES = [
    "hour_of_day",
    "day_of_week",
    "month",
    "is_weekend",
    "is_month_end",
    "is_month_start",
    "is_rush_hour",
    "is_off_hours",
]
NUMERICAL_FEATURES = RAW_NUMERICAL_FEATURES + TIMESTAMP_FEATURES
CATEGORICAL_FEATURES = RAW_CATEGORICAL_FEATURES
MODEL_FEATURES = NUMERICAL_FEATURES + CATEGORICAL_FEATURES

# The frontend has no history service. These columns are explicitly excluded,
# even when they are predictive in the offline CSV.
HISTORY_FEATURES = [
    "transaction_count_24h",
    "avg_transaction_amount",
    "time_since_last_transaction",
    "transaction_count_7d",
    "transaction_count_30d",
    "amount_zscore",
    "amount_percentile",
    "amount_rolling_mean_7d",
    "amount_rolling_std_7d",
    "location_changed",
    "device_changed",
    "merchant_category_changed",
    "avg_amount_ratio",
    "transaction_velocity",
]
DERIVED_HISTORY_INTERACTIONS = [
    "amount_x_transaction_count",
    "amount_x_is_foreign",
    "transaction_count_x_is_foreign",
]
EXCLUDED_FEATURES = IDENTIFIERS + [TARGET, RISK_SCORE] + HISTORY_FEATURES + DERIVED_HISTORY_INTERACTIONS


def _one_hot_encoder() -> OneHotEncoder:
    """Create a dense encoder across supported scikit-learn versions."""
    try:
        return OneHotEncoder(handle_unknown="ignore", sparse_output=False)
    except TypeError:  # scikit-learn < 1.2
        return OneHotEncoder(handle_unknown="ignore", sparse=False)


class TimestampFeatureBuilder(BaseEstimator, TransformerMixin):
    """Replace the raw timestamp with deterministic, inference-time features.

    Timestamps are parsed as timezone-naive values because that is how the CSV
    stores them. Rush hour is defined as 07:00-09:59 or 16:00-18:59, and off
    hours as before 06:00 or at/after 22:00. The same transformer is serialized
    inside every trained pipeline and used for prediction.
    """

    def fit(self, X: pd.DataFrame, y: Iterable | None = None) -> "TimestampFeatureBuilder":
        self._validate_columns(X)
        return self

    def transform(self, X: pd.DataFrame) -> pd.DataFrame:
        self._validate_columns(X)
        frame = X.loc[:, API_INPUT_FEATURES].copy()
        parsed = pd.to_datetime(frame["timestamp"], errors="coerce", format="mixed")
        if parsed.isna().any():
            bad_rows = parsed[parsed.isna()].index.tolist()[:5]
            raise ValueError(f"Invalid timestamp value at rows: {bad_rows}")

        result = pd.DataFrame(index=frame.index)
        for column in RAW_NUMERICAL_FEATURES:
            result[column] = pd.to_numeric(frame[column], errors="raise")
        for column in RAW_CATEGORICAL_FEATURES:
            result[column] = frame[column].astype("string")

        hour = parsed.dt.hour
        result["hour_of_day"] = hour.astype(float)
        result["day_of_week"] = parsed.dt.dayofweek.astype(float)
        result["month"] = parsed.dt.month.astype(float)
        result["is_weekend"] = (parsed.dt.dayofweek >= 5).astype(float)
        result["is_month_end"] = parsed.dt.is_month_end.astype(float)
        result["is_month_start"] = parsed.dt.is_month_start.astype(float)
        result["is_rush_hour"] = (
            ((hour >= 7) & (hour < 10)) | ((hour >= 16) & (hour < 19))
        ).astype(float)
        result["is_off_hours"] = ((hour < 6) | (hour >= 22)).astype(float)
        return result.loc[:, MODEL_FEATURES]

    @staticmethod
    def _validate_columns(X: pd.DataFrame) -> None:
        if not isinstance(X, pd.DataFrame):
            raise TypeError("Fraud input must be a pandas DataFrame")
        missing = [column for column in API_INPUT_FEATURES if column not in X.columns]
        if missing:
            raise ValueError(f"Missing required input columns: {missing}")


def build_preprocessor(scale_numeric: bool = True) -> ColumnTransformer:
    numeric_steps: list[tuple[str, object]] = [("imputer", SimpleImputer(strategy="median"))]
    if scale_numeric:
        numeric_steps.append(("scaler", StandardScaler()))
    numeric_pipeline = Pipeline(numeric_steps)
    categorical_pipeline = Pipeline(
        [
            ("imputer", SimpleImputer(strategy="most_frequent")),
            ("encoder", _one_hot_encoder()),
        ]
    )
    return ColumnTransformer(
        transformers=[
            ("numeric", numeric_pipeline, NUMERICAL_FEATURES),
            ("categorical", categorical_pipeline, CATEGORICAL_FEATURES),
        ],
        remainder="drop",
        verbose_feature_names_out=False,
    )


def validate_training_frame(frame: pd.DataFrame) -> None:
    missing = [column for column in [*API_INPUT_FEATURES, TARGET] if column not in frame.columns]
    if missing:
        raise ValueError(f"Dataset is missing required columns: {missing}")
    target_values = set(frame[TARGET].dropna().unique().tolist())
    if target_values != {0, 1}:
        raise ValueError(f"{TARGET} must contain exactly 0 and 1, found {sorted(target_values)}")
    if frame[API_INPUT_FEATURES].isna().any().any():
        missing_counts = frame[API_INPUT_FEATURES].isna().sum()
        raise ValueError(f"Required API fields contain missing values: {missing_counts[missing_counts > 0].to_dict()}")


def feature_contract() -> dict[str, object]:
    return {
        "api_input_features": API_INPUT_FEATURES,
        "model_features": MODEL_FEATURES,
        "numerical_features": NUMERICAL_FEATURES,
        "categorical_features": CATEGORICAL_FEATURES,
        "timestamp_features": TIMESTAMP_FEATURES,
        "excluded_features": EXCLUDED_FEATURES,
        "timestamp_policy": {
            "timezone": "timezone-naive values interpreted as stored",
            "rush_hour": "07:00-09:59 or 16:00-18:59",
            "off_hours": "before 06:00 or at/after 22:00",
        },
    }
