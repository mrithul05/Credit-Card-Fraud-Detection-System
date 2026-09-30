"""Train, compare, select, and serialize the fraud detection pipeline."""

from __future__ import annotations

import argparse
import hashlib
import json
import platform
import sys
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
from imblearn.over_sampling import SMOTE
from imblearn.pipeline import Pipeline as ImbPipeline
from sklearn.ensemble import (
    GradientBoostingClassifier,
    RandomForestClassifier,
    StackingClassifier,
    VotingClassifier,
)
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split

from .evaluate import add_model_summary, choose_threshold, metric_dict, threshold_sweep
from .preprocessing import (
    API_INPUT_FEATURES,
    TARGET,
    TimestampFeatureBuilder,
    build_preprocessor,
    feature_contract,
    validate_training_frame,
)

SEED = 42

try:
    from xgboost import XGBClassifier

    XGBOOST_AVAILABLE = True
    XGBOOST_ERROR = None
except Exception as exc:  # pragma: no cover - depends on optional platform package
    XGBClassifier = None  # type: ignore[assignment,misc]
    XGBOOST_AVAILABLE = False
    XGBOOST_ERROR = f"{type(exc).__name__}: {exc}"


def dataset_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def make_model(model_name: str, strategy: str) -> Any:
    if model_name == "Logistic Regression":
        return LogisticRegression(
            max_iter=2000,
            class_weight="balanced" if strategy == "class_weight" else None,
            solver="liblinear",
            random_state=SEED,
        )
    if model_name == "Random Forest":
        return RandomForestClassifier(
            n_estimators=250,
            max_depth=14,
            min_samples_leaf=2,
            class_weight="balanced" if strategy == "class_weight" else None,
            random_state=SEED,
            n_jobs=-1,
        )
    if model_name == "Gradient Boosting":
        return GradientBoostingClassifier(
            n_estimators=180,
            learning_rate=0.05,
            max_depth=3,
            min_samples_leaf=3,
            random_state=SEED,
        )
    if model_name == "XGBoost":
        if not XGBOOST_AVAILABLE or XGBClassifier is None:
            raise RuntimeError(f"XGBoost is unavailable: {XGBOOST_ERROR}")
        return XGBClassifier(
            n_estimators=220,
            max_depth=4,
            learning_rate=0.05,
            min_child_weight=2,
            subsample=0.9,
            colsample_bytree=0.9,
            objective="binary:logistic",
            eval_metric="logloss",
            scale_pos_weight=19.0 if strategy == "class_weight" else 1.0,
            random_state=SEED,
            n_jobs=-1,
            tree_method="hist",
        )
    raise ValueError(f"Unsupported model: {model_name}")


def build_pipeline(model_name: str, strategy: str) -> ImbPipeline:
    if strategy not in {"none", "class_weight", "smote"}:
        raise ValueError(f"Unsupported imbalance strategy: {strategy}")
    model = make_model(model_name, strategy)
    steps: list[tuple[str, Any]] = [
        ("features", TimestampFeatureBuilder()),
        # Dense output is intentional for the SMOTE experiment. The synthetic
        # samples are created only inside this training pipeline after splitting.
        ("preprocessor", build_preprocessor(scale_numeric=model_name == "Logistic Regression")),
    ]
    if strategy == "smote":
        steps.append(("smote", SMOTE(random_state=SEED)))
    steps.append(("model", model))
    return ImbPipeline(steps)


def candidate_specs() -> list[tuple[str, str]]:
    specs = [
        ("Logistic Regression", "none"),
        ("Logistic Regression", "class_weight"),
        ("Logistic Regression", "smote"),
        ("Random Forest", "class_weight"),
        ("Random Forest", "smote"),
        ("Gradient Boosting", "none"),
    ]
    if XGBOOST_AVAILABLE:
        specs.append(("XGBoost", "class_weight"))
    return specs


def ensemble_estimators() -> list[tuple[str, Any]]:
    return [
        ("logistic_regression", build_pipeline("Logistic Regression", "class_weight")),
        ("random_forest", build_pipeline("Random Forest", "class_weight")),
        ("gradient_boosting", build_pipeline("Gradient Boosting", "none")),
    ]


def serializable(value: Any) -> Any:
    if isinstance(value, dict):
        return {str(key): serializable(item) for key, item in value.items()}
    if isinstance(value, list):
        return [serializable(item) for item in value]
    if isinstance(value, tuple):
        return [serializable(item) for item in value]
    if isinstance(value, (np.integer,)):
        return int(value)
    if isinstance(value, (np.floating,)):
        return float(value)
    if isinstance(value, np.ndarray):
        return value.tolist()
    return value


def run_candidate(
    name: str,
    strategy: str,
    X_train: pd.DataFrame,
    y_train: pd.Series,
    X_validation: pd.DataFrame,
    y_validation: pd.Series,
) -> dict[str, Any]:
    pipeline = build_pipeline(name, strategy)
    pipeline.fit(X_train, y_train)
    probabilities = pipeline.predict_proba(X_validation)[:, 1]
    sweep = threshold_sweep(y_validation, probabilities)
    selected = choose_threshold(sweep)
    return {
        "name": name,
        "strategy": strategy,
        "pipeline": pipeline,
        "probabilities": probabilities,
        "summary": add_model_summary(name, strategy, sweep, selected),
        "selected": selected,
    }


def run_ensembles(
    X_train: pd.DataFrame,
    y_train: pd.Series,
    X_validation: pd.DataFrame,
    y_validation: pd.Series,
) -> list[dict[str, Any]]:
    ensembles: list[tuple[str, Any]] = []
    voting_base = ensemble_estimators()
    ensembles.append(
        (
            "Soft Voting",
            VotingClassifier(
                estimators=voting_base,
                voting="soft",
                weights=[1, 1, 1],
                n_jobs=-1,
            ),
        )
    )
    stacking_base = ensemble_estimators()
    ensembles.append(
        (
            "Stacking",
            StackingClassifier(
                estimators=stacking_base,
                final_estimator=LogisticRegression(max_iter=2000, class_weight="balanced", random_state=SEED),
                stack_method="predict_proba",
                cv=5,
                n_jobs=-1,
            ),
        )
    )

    results = []
    for name, estimator in ensembles:
        estimator.fit(X_train, y_train)
        probabilities = estimator.predict_proba(X_validation)[:, 1]
        sweep = threshold_sweep(y_validation, probabilities)
        selected = choose_threshold(sweep)
        results.append(
            {
                "name": name,
                "strategy": "ensemble",
                "pipeline": estimator,
                "probabilities": probabilities,
                "summary": add_model_summary(name, "ensemble", sweep, selected),
                "selected": selected,
            }
        )
    return results


def selection_key(result: dict[str, Any]) -> tuple[float, float, float, float, int]:
    selected = result["selected"]
    # F0.5 is the explicit threshold objective; PR-AUC and F1 break ties.
    complexity = {"Logistic Regression": 0, "Random Forest": 1, "Gradient Boosting": 2, "XGBoost": 3, "Soft Voting": 4, "Stacking": 5}.get(result["name"], 6)
    return (
        float(selected["f0_5"]),
        float(selected["pr_auc"]),
        float(selected["f1"]),
        float(selected["recall"]),
        -complexity,
    )


def train(data_path: Path, models_dir: Path, analysis_dir: Path) -> dict[str, Any]:
    frame = pd.read_csv(data_path)
    validate_training_frame(frame)
    X = frame.loc[:, API_INPUT_FEATURES].copy()
    y = frame[TARGET].astype(int)

    X_train_validation, X_test, y_train_validation, y_test = train_test_split(
        X,
        y,
        test_size=0.20,
        stratify=y,
        random_state=SEED,
    )
    X_train, X_validation, y_train, y_validation = train_test_split(
        X_train_validation,
        y_train_validation,
        test_size=0.20,
        stratify=y_train_validation,
        random_state=SEED,
    )

    user_ids = frame["user_id"].astype(str)
    train_users = set(user_ids.loc[X_train.index])
    validation_users = set(user_ids.loc[X_validation.index])
    test_users = set(user_ids.loc[X_test.index])
    user_overlap = {
        "train_validation": len(train_users & validation_users),
        "train_test": len(train_users & test_users),
        "validation_test": len(validation_users & test_users),
    }

    results: list[dict[str, Any]] = []
    errors: list[dict[str, str]] = []
    for name, strategy in candidate_specs():
        try:
            result = run_candidate(name, strategy, X_train, y_train, X_validation, y_validation)
            results.append(result)
            selected = result["selected"]
            print(
                f"{name} [{strategy}] validation: threshold={selected['threshold']:.2f} "
                f"precision={selected['precision']:.4f} recall={selected['recall']:.4f} "
                f"f1={selected['f1']:.4f} f0.5={selected['f0_5']:.4f} "
                f"roc_auc={selected['roc_auc']:.4f} pr_auc={selected['pr_auc']:.4f}"
            )
        except Exception as exc:
            errors.append({"model": name, "strategy": strategy, "error": f"{type(exc).__name__}: {exc}"})
            print(f"Skipping {name} [{strategy}]: {type(exc).__name__}: {exc}")

    for result in run_ensembles(X_train, y_train, X_validation, y_validation):
        results.append(result)
        selected = result["selected"]
        print(
            f"{result['name']} [ensemble] validation: threshold={selected['threshold']:.2f} "
            f"precision={selected['precision']:.4f} recall={selected['recall']:.4f} "
            f"f1={selected['f1']:.4f} f0.5={selected['f0_5']:.4f} "
            f"roc_auc={selected['roc_auc']:.4f} pr_auc={selected['pr_auc']:.4f}"
        )

    if not results:
        raise RuntimeError(f"No model completed successfully. Errors: {errors}")
    selected_result = max(results, key=selection_key)
    final_probabilities = selected_result["pipeline"].predict_proba(X_test)[:, 1]
    final_test = metric_dict(y_test, final_probabilities, float(selected_result["selected"]["threshold"]))

    models_dir.mkdir(parents=True, exist_ok=True)
    analysis_dir.mkdir(parents=True, exist_ok=True)
    artifact_path = models_dir / "fraud_detection_pipeline.joblib"
    metadata_path = models_dir / "model_metadata.json"
    artifact = {
        "pipeline": selected_result["pipeline"],
        "threshold": float(selected_result["selected"]["threshold"]),
        "model_name": selected_result["name"],
        "imbalance_strategy": selected_result["strategy"],
        "feature_contract": feature_contract(),
        "seed": SEED,
    }
    joblib.dump(artifact, artifact_path)

    comparison_rows = []
    comparison_details = []
    for result in results:
        selected = result["selected"]
        comparison_rows.append(
            {
                "model": result["name"],
                "imbalance_strategy": result["strategy"],
                **{key: selected[key] for key in ["threshold", "precision", "recall", "f1", "f0_5", "roc_auc", "pr_auc"]},
            }
        )
        comparison_details.append(result["summary"])
    comparison_frame = pd.DataFrame(comparison_rows)
    comparison_frame.to_csv(analysis_dir / "model_comparison_validation.csv", index=False)
    (analysis_dir / "threshold_sweeps.json").write_text(json.dumps(serializable(comparison_details), indent=2), encoding="utf-8")

    metadata = {
        "project": "Credit Card Fraud Detection",
        "target": TARGET,
        "model_name": selected_result["name"],
        "imbalance_strategy": selected_result["strategy"],
        "threshold": float(selected_result["selected"]["threshold"]),
        "features": feature_contract()["model_features"],
        "feature_groups": {
            "api_inputs": feature_contract()["api_input_features"],
            "numerical": feature_contract()["numerical_features"],
            "categorical": feature_contract()["categorical_features"],
            "timestamp_derived": feature_contract()["timestamp_features"],
        },
        "excluded_features": feature_contract()["excluded_features"],
        "exclusion_reasons": {
            "transaction_id/user_id": "Identifiers; retained only as metadata and never passed to the estimator.",
            "is_fraud": "Target label, never an input feature.",
            "risk_score": "Unknown provenance and suspicious target association; excluded as possible target/post-event leakage.",
            "history_and_interactions": "Require as-of user history unavailable in the frontend/API prediction payload.",
            "raw_timestamp": "Parsed by the shared transformer into deterministic timestamp features.",
        },
        "dataset": {
            "path": str(data_path),
            "sha256": dataset_sha256(data_path),
            "rows": int(frame.shape[0]),
            "columns": int(frame.shape[1]),
            "fraud": int(y.sum()),
            "genuine": int((y == 0).sum()),
            "fraud_percentage": float(100 * y.mean()),
        },
        "split": {
            "training_rows": int(len(X_train)),
            "validation_rows": int(len(X_validation)),
            "test_rows": int(len(X_test)),
            "method": "stratified 80/20 train-test, then stratified 80/20 train-validation",
            "random_state": SEED,
            "user_overlap_counts": user_overlap,
        },
        "metrics": {
            "precision": final_test["precision"],
            "recall": final_test["recall"],
            "f1": final_test["f1"],
            "f0_5": final_test["f0_5"],
            "roc_auc": final_test["roc_auc"],
            "pr_auc": final_test["pr_auc"],
            "true_positives": final_test["true_positives"],
            "true_negatives": final_test["true_negatives"],
            "false_positives": final_test["false_positives"],
            "false_negatives": final_test["false_negatives"],
        },
        "validation_model_comparison": comparison_rows,
        "final_test_metrics": final_test,
        "threshold_selection": "Validation-only sweep from 0.30 to 0.70; maximize F0.5, then PR-AUC, F1, recall, and prefer the simpler model on exact ties.",
        "xgboost": {"available": XGBOOST_AVAILABLE, "error": XGBOOST_ERROR},
        "training_environment": {
            "python": sys.version,
            "platform": platform.platform(),
            "numpy": np.__version__,
            "pandas": pd.__version__,
        },
        "training_errors": errors,
    }
    metadata_path.write_text(json.dumps(serializable(metadata), indent=2), encoding="utf-8")
    print(f"\nSelected final model: {selected_result['name']} [{selected_result['strategy']}]")
    print(f"Validation threshold: {selected_result['selected']['threshold']:.2f}")
    print("Final untouched test metrics:", json.dumps(serializable(final_test), indent=2))
    print(f"Saved pipeline: {artifact_path}")
    print(f"Saved metadata: {metadata_path}")
    return metadata


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    root = Path(__file__).resolve().parents[2]
    parser.add_argument("--data", type=Path, default=root / "dataset" / "fraud_detection_dataset.csv")
    parser.add_argument("--models-dir", type=Path, default=root / "backend" / "models")
    parser.add_argument("--analysis-dir", type=Path, default=root / "backend" / "analysis")
    args = parser.parse_args()
    train(args.data, args.models_dir, args.analysis_dir)


if __name__ == "__main__":
    main()
