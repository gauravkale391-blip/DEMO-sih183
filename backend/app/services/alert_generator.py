from datetime import datetime


def generate_alert(wallet_address, risk_result, exchange_matches=None):
    """
    Generate an investigator alert from risk-scoring results.
    """

    exchange_matches = exchange_matches or []

    risk_level = risk_result.get("risk_level", "LOW")
    risk_score = risk_result.get("risk_score", 0)

    if risk_level == "HIGH":
        severity = "CRITICAL"
        alert_type = "FRAUD_SUSPECTED"

    elif risk_level == "MEDIUM":
        severity = "WARNING"
        alert_type = "SUSPICIOUS_ACTIVITY"

    else:
        severity = "INFO"
        alert_type = "LOW_RISK_ACTIVITY"

    exchanges = []

    for match in exchange_matches:
        exchanges.append({
            "exchange": match.get("exchange"),
            "type": match.get("type"),
            "chain": match.get("chain"),
            "matched_address": match.get("matched_address")
        })

    return {
        "alert_type": alert_type,
        "severity": severity,
        "wallet_address": wallet_address.lower(),
        "risk_score": risk_score,
        "risk_level": risk_level,
        "detected_patterns": risk_result.get(
            "detected_patterns", []
        ),
        "reasons": risk_result.get("reasons", []),
        "exchange_matches": exchanges,
        "generated_at": datetime.utcnow().isoformat()
    }
