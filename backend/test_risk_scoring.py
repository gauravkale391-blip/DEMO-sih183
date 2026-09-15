from app.services.risk_scoring import calculate_risk


findings = [
    {
        "pattern": "FAN_OUT"
    },
    {
        "pattern": "LAYERING"
    },
    {
        "pattern": "PEELING_CHAIN"
    },
    {
        "pattern": "ROUND_TRIP"
    }
]

exchange_matches = [
    {
        "exchange": "Exchange_A",
        "type": "CEX"
    }
]


result = calculate_risk(
    findings,
    exchange_matches
)

print("Risk Score:", result["risk_score"])
print("Risk Level:", result["risk_level"])

print("\nDetected Patterns:")
for pattern in result["detected_patterns"]:
    print(" -", pattern)

print("\nReasons:")
for reason in result["reasons"]:
    print(" -", reason)
