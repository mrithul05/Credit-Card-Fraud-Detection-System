"""Evaluation metrics and validation-only threshold selection."""

from __future__ import annotations

from typing import Iterable

import numpy as np
from sklearn.metrics import (
    average_precision_score,
    confusion_matrix,
    f1_score,
    fbeta_score,
    precision_score,
    recall_score,
    roc_auc_score,
)

THRESHOLDS = [round(value, 2) for value in np.arange(0.30, 0.701, 0.05)]


def metric_dict(y_true: Iterable[int], probabilities: Iterable[float], threshold: float) -> dict[str, float | int]:
    y_true_array = np.asarray(list(y_true), dtype=int)
    probability_array = np.asarray(list(probabilities), dtype=float)
    predictions = (probability_array >= threshold).astype(int)
    tn, fp, fn, tp = confusion_matrix(y_true_array, predictions, labels=[0, 1]).ravel()
    return {
        "threshold": float(threshold),
        "precision": float(precision_score(y_true_array, predictions, zero_division=0)),
        "recall": float(recall_score(y_true_array, predictions, zero_division=0)),
        "f1": float(f1_score(y_true_array, predictions, zero_division=0)),
        "f0_5": float(fbeta_score(y_true_array, predictions, beta=0.5, zero_division=0)),
        "roc_auc": float(roc_auc_score(y_true_array, probability_array)),
        "pr_auc": float(average_precision_score(y_true_array, probability_array)),
        "true_positives": int(tp),
        "true_negatives": int(tn),
        "false_positives": int(fp),
        "false_negatives": int(fn),
    }


def threshold_sweep(
    y_true: Iterable[int], probabilities: Iterable[float], thresholds: Iterable[float] = THRESHOLDS
) -> list[dict[str, float | int]]:
    y_true_array = np.asarray(list(y_true), dtype=int)
    probability_array = np.asarray(list(probabilities), dtype=float)
    roc_auc = float(roc_auc_score(y_true_array, probability_array))
    pr_auc = float(average_precision_score(y_true_array, probability_array))
    results: list[dict[str, float | int]] = []
    for threshold in thresholds:
        result = metric_dict(y_true_array, probability_array, float(threshold))
        result["roc_auc"] = roc_auc
        result["pr_auc"] = pr_auc
        results.append(result)
    return results


def choose_threshold(rows: list[dict[str, float | int]]) -> dict[str, float | int]:
    """Choose a threshold using validation F0.5, then PR-AUC/F1/recall."""
    if not rows:
        raise ValueError("Cannot choose a threshold from an empty sweep")
    return max(
        rows,
        key=lambda row: (
            float(row["f0_5"]),
            float(row["pr_auc"]),
            float(row["f1"]),
            float(row["recall"]),
            -float(row["threshold"]),
        ),
    )


def add_model_summary(
    name: str,
    strategy: str,
    validation_rows: list[dict[str, float | int]],
    selected: dict[str, float | int],
) -> dict[str, object]:
    return {
        "model": name,
        "imbalance_strategy": strategy,
        "validation": selected,
        "threshold_sweep": validation_rows,
    }
