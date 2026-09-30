"""FastAPI adapter for the offline-trained fraud prediction pipeline."""

from __future__ import annotations

import os
from typing import Literal

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict, Field

from src.predict import default_models_dir, load_artifact, predict_transaction

app = FastAPI(title="Credit Card Fraud Detection API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        os.getenv("FRONTEND_ORIGIN", "http://localhost:5173"),
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


class TransactionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    amount: float = Field(ge=0)
    merchant_category: str = Field(min_length=1)
    location: str = Field(min_length=1)
    timestamp: str = Field(min_length=1)
    device_type: str = Field(min_length=1)
    user_age: float = Field(ge=0, le=120)
    account_age_days: float = Field(ge=0)
    is_foreign_transaction: bool


class PredictionResponse(BaseModel):
    prediction: Literal["genuine", "potential_fraud"]
    is_fraud: int
    fraud_probability: float
    probability: float
    threshold: float


@app.get("/health")
def health() -> dict[str, object]:
    try:
        load_artifact(default_models_dir())
    except (FileNotFoundError, ValueError, OSError) as exc:
        return {"status": "model_unavailable", "detail": str(exc)}
    return {"status": "ok", "model_loaded": True}


@app.post("/predict", response_model=PredictionResponse)
def predict(request: TransactionRequest) -> PredictionResponse:
    try:
        result = predict_transaction(request.model_dump(), default_models_dir())
    except (FileNotFoundError, ValueError, TypeError, OSError) as exc:
        status = 503 if isinstance(exc, FileNotFoundError) else 422
        raise HTTPException(status_code=status, detail=str(exc)) from exc
    return PredictionResponse(**result)
