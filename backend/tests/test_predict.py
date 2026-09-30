from __future__ import annotations

import pytest

from src.predict import validate_transaction


VALID = {
    "amount": 125.5,
    "merchant_category": "Grocery",
    "location": "US",
    "timestamp": "2025-01-15T13:45:00",
    "device_type": "Mobile",
    "user_age": 34,
    "account_age_days": 420,
    "is_foreign_transaction": False,
}


def test_prediction_contract_accepts_frontend_payload():
    result = validate_transaction(VALID)
    assert set(result) == set(VALID)
    assert result["is_foreign_transaction"] == 0


@pytest.mark.parametrize("field", ["is_fraud", "risk_score", "transaction_id", "user_id"])
def test_prediction_contract_rejects_leakage_or_identifier_fields(field):
    payload = dict(VALID)
    payload[field] = 1
    if field in {"transaction_id", "user_id"}:
        # Identifiers are allowed as metadata by the lower-level helper, but
        # they are deliberately never included in the returned model frame.
        result = validate_transaction(payload)
        assert field not in result
    else:
        with pytest.raises(ValueError, match="target/leakage"):
            validate_transaction(payload)


def test_prediction_contract_rejects_missing_and_bad_values():
    missing = dict(VALID)
    del missing["timestamp"]
    with pytest.raises(ValueError, match="Missing required"):
        validate_transaction(missing)

    invalid = dict(VALID, amount=-1)
    with pytest.raises(ValueError, match="non-negative"):
        validate_transaction(invalid)

    invalid_timestamp = dict(VALID, timestamp="not-a-date")
    with pytest.raises(ValueError, match="parseable"):
        validate_transaction(invalid_timestamp)
