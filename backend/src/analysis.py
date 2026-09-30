"""Programmatic dataset analysis and leakage review."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import numpy as np
import pandas as pd

from .preprocessing import (
    API_INPUT_FEATURES,
    DERIVED_HISTORY_INTERACTIONS,
    HISTORY_FEATURES,
    IDENTIFIERS,
    TARGET,
)

EXPECTED_COLUMNS = 37
SUSPICIOUS_FEATURES = [
    "risk_score",
    "amount_zscore",
    "amount_percentile",
    "amount_rolling_mean_7d",
    "amount_rolling_std_7d",
    "avg_amount_ratio",
    "transaction_velocity",
    *DERIVED_HISTORY_INTERACTIONS,
]


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def _jsonable(value: object) -> object:
    if isinstance(value, (np.integer,)):
        return int(value)
    if isinstance(value, (np.floating,)):
        return float(value)
    if isinstance(value, (np.bool_,)):
        return bool(value)
    if pd.isna(value):
        return None
    return value


def _formula_check(frame: pd.DataFrame, output: str, expected: pd.Series) -> dict[str, object]:
    differences = (pd.to_numeric(frame[output]) - expected).abs()
    return {
        "output": output,
        "matches_within_1e-8": int((differences <= 1e-8).sum()),
        "rows": int(len(frame)),
        "max_absolute_difference": float(differences.max()),
    }


def analyze_dataset(path: Path) -> dict[str, object]:
    frame = pd.read_csv(path)
    numeric = frame.select_dtypes(include="number")
    target_counts = frame[TARGET].value_counts(dropna=False).sort_index()
    timestamp = pd.to_datetime(frame["timestamp"], errors="coerce")

    numeric_summary: dict[str, dict[str, float | int]] = {}
    outlier_summary: dict[str, int] = {}
    for column in numeric.columns:
        values = numeric[column].dropna()
        if values.empty:
            continue
        q1, q3 = values.quantile([0.25, 0.75])
        iqr = q3 - q1
        outlier_summary[column] = int(((values < q1 - 1.5 * iqr) | (values > q3 + 1.5 * iqr)).sum())
        numeric_summary[column] = {
            "min": float(values.min()),
            "max": float(values.max()),
            "mean": float(values.mean()),
            "median": float(values.median()),
            "std": float(values.std(ddof=0)),
            "outliers_iqr": outlier_summary[column],
        }

    target_correlations: dict[str, float] = {}
    target_means: dict[str, dict[str, float]] = {}
    for column in numeric.columns:
        if column == TARGET:
            continue
        target_correlations[column] = float(frame[column].corr(frame[TARGET]))
        target_means[column] = {
            "genuine_mean": float(frame.loc[frame[TARGET] == 0, column].mean()),
            "fraud_mean": float(frame.loc[frame[TARGET] == 1, column].mean()),
        }

    formulas = [
        _formula_check(frame, "amount_x_transaction_count", frame["amount"] * frame["transaction_count_24h"]),
        _formula_check(frame, "amount_x_is_foreign", frame["amount"] * frame["is_foreign_transaction"]),
        _formula_check(
            frame,
            "transaction_count_x_is_foreign",
            frame["transaction_count_24h"] * frame["is_foreign_transaction"],
        ),
    ]
    timestamp_consistency = {
        "parse_failures": int(timestamp.isna().sum()),
        "day_of_week_matches": int((timestamp.dt.dayofweek == frame["day_of_week"]).sum()),
        "month_matches": int((timestamp.dt.month == frame["month"]).sum()),
        "hour_of_day_matches": int((timestamp.dt.hour == frame["hour_of_day"]).sum()),
        "is_weekend_matches": int(((timestamp.dt.dayofweek >= 5).astype(int) == frame["is_weekend"]).sum()),
        "is_month_end_matches": int((timestamp.dt.is_month_end.astype(int) == frame["is_month_end"]).sum()),
        "is_month_start_matches": int((timestamp.dt.is_month_start.astype(int) == frame["is_month_start"]).sum()),
    }

    risk_by_value: dict[str, dict[str, int]] = {}
    if "risk_score" in frame:
        grouped = frame.groupby("risk_score")[TARGET].agg(["count", "sum"]).sort_index()
        for value, row in grouped.iterrows():
            risk_by_value[str(value)] = {"rows": int(row["count"]), "fraud": int(row["sum"])}

    categorical_summary = {
        column: {
            "unique": int(frame[column].nunique(dropna=False)),
            "values": {str(key): int(value) for key, value in frame[column].value_counts(dropna=False).items()},
        }
        for column in frame.select_dtypes(exclude="number").columns
    }

    return {
        "dataset": {
            "path": str(path),
            "sha256": _sha256(path),
            "rows": int(frame.shape[0]),
            "columns": int(frame.shape[1]),
            "column_names": frame.columns.tolist(),
            "dtypes": {column: str(dtype) for column, dtype in frame.dtypes.items()},
            "expected_shape_verified": bool(frame.shape == (10000, EXPECTED_COLUMNS)),
        },
        "quality": {
            "missing_values": {column: int(value) for column, value in frame.isna().sum().items()},
            "missing_total": int(frame.isna().sum().sum()),
            "duplicate_rows": int(frame.duplicated().sum()),
            "duplicate_transaction_ids": int(frame["transaction_id"].duplicated().sum()),
            "unique_users": int(frame["user_id"].nunique()),
        },
        "target": {
            "name": TARGET,
            "values": {str(_jsonable(key)): int(value) for key, value in target_counts.items()},
            "fraud": int(target_counts.get(1, 0)),
            "genuine": int(target_counts.get(0, 0)),
            "fraud_percentage": float(100 * target_counts.get(1, 0) / len(frame)),
        },
        "categorical_summary": categorical_summary,
        "numeric_summary": numeric_summary,
        "target_correlations": target_correlations,
        "target_conditional_means": target_means,
        "outlier_counts_iqr": outlier_summary,
        "timestamp": {
            "min": str(timestamp.min()),
            "max": str(timestamp.max()),
            "unique": int(frame["timestamp"].nunique()),
            "consistency": timestamp_consistency,
        },
        "derived_formula_checks": formulas,
        "risk_score_distribution_by_target": risk_by_value,
        "leakage_review": {
            "excluded_identifiers": IDENTIFIERS,
            "excluded_target": [TARGET],
            "excluded_risk_score": "Unknown provenance and suspicious target association; not safe for prediction-time use.",
            "excluded_history_features": HISTORY_FEATURES,
            "excluded_interactions": DERIVED_HISTORY_INTERACTIONS,
            "reason": "The frontend supplies no transaction history, and rolling/cumulative values cannot be reconstructed as-of prediction from the API payload.",
            "api_features_retained": API_INPUT_FEATURES,
            "suspicious_features_investigated": SUSPICIOUS_FEATURES,
        },
    }


def render_markdown(report: dict[str, object]) -> str:
    dataset = report["dataset"]
    quality = report["quality"]
    target = report["target"]
    timestamp = report["timestamp"]
    review = report["leakage_review"]
    lines = [
        "# Fraud Dataset Analysis",
        "",
        "## Dataset",
        f"- Rows: {dataset['rows']}",
        f"- Columns: {dataset['columns']}",
        f"- Shape matches expected 10,000 x 37: {dataset['expected_shape_verified']}",
        f"- SHA-256: `{dataset['sha256']}`",
        f"- Target values: {target['values']}",
        f"- Genuine: {target['genuine']}; fraud: {target['fraud']} ({target['fraud_percentage']:.2f}%)",
        "",
        "## Data quality",
        f"- Missing values: {quality['missing_total']}",
        f"- Duplicate rows: {quality['duplicate_rows']}",
        f"- Duplicate transaction IDs: {quality['duplicate_transaction_ids']}",
        f"- Unique users: {quality['unique_users']}",
        "",
        "## Timestamp review",
        f"- Range: `{timestamp['min']}` to `{timestamp['max']}`",
        f"- Parse failures: {timestamp['consistency']['parse_failures']}",
        f"- Derived columns matching the raw timestamp: {timestamp['consistency']}",
        "",
        "## Leakage and feature decisions",
        f"- Retained API fields: `{', '.join(review['api_features_retained'])}`",
        f"- Excluded identifiers: `{', '.join(review['excluded_identifiers'])}`",
        f"- Excluded target: `{TARGET}`",
        f"- Excluded `risk_score`: {review['excluded_risk_score']}",
        f"- Excluded history/rolling fields: `{', '.join(review['excluded_history_features'])}`",
        f"- Excluded history-dependent interactions: `{', '.join(review['excluded_interactions'])}`",
        f"- Rationale: {review['reason']}",
        "",
        "## Derived feature checks",
    ]
    for check in report["derived_formula_checks"]:
        lines.append(
            f"- `{check['output']}` exact/near matches: {check['matches_within_1e-8']}/{check['rows']} "
            f"(max absolute difference {check['max_absolute_difference']:.6g})"
        )
    lines.extend(
        [
            "",
            "The training pipeline recomputes timestamp features from the raw timestamp rather than trusting inconsistent precomputed timestamp columns. `risk_score` is not used because its provenance cannot be established and its distribution is strongly associated with the target.",
            "",
        ]
    )
    return "\n".join(lines)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    root = Path(__file__).resolve().parents[2]
    parser.add_argument("--data", type=Path, default=root / "dataset" / "fraud_detection_dataset.csv")
    parser.add_argument("--output-dir", type=Path, default=root / "backend" / "analysis")
    args = parser.parse_args()
    report = analyze_dataset(args.data)
    args.output_dir.mkdir(parents=True, exist_ok=True)
    (args.output_dir / "dataset_analysis.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    (args.output_dir / "dataset_analysis.md").write_text(render_markdown(report), encoding="utf-8")
    print(render_markdown(report))


if __name__ == "__main__":
    main()
