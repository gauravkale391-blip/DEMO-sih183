from app.services.alert_generator import generate_alert


risk_result = {
    "risk_score": 100,
    "risk_level": "HIGH",
    "detected_patterns": [
        "FAN_OUT",
        "LAYERING",
        "PEELING_CHAIN",
        "ROUND_TRIP"
    ],
    "reasons": [
        "FAN_OUT detected (+15)",
        "LAYERING detected (+20)",
        "PEELING_CHAIN detected (+20)",
        "ROUND_TRIP detected (+25)",
        "Known exchange address matched (+30)"
    ]
}


exchange_matches = [
    {
        "exchange": "Exchange_A",
        "type": "CEX",
        "chain": "EVM",
        "matched_address": "0x1111111111111111111111111111111111111111"
    }
]


alert = generate_alert(
    "0x1111111111111111111111111111111111111111",
    risk_result,
    exchange_matches
)


print("Alert Type:", alert["alert_type"])
print("Severity:", alert["severity"])
print("Wallet:", alert["wallet_address"])
print("Risk Score:", alert["risk_score"])
print("Risk Level:", alert["risk_level"])

print("\nPatterns:")
for pattern in alert["detected_patterns"]:
    print(" -", pattern)

print("\nExchange Matches:")
for exchange in alert["exchange_matches"]:
    print(" -", exchange["exchange"])

print("\nGenerated At:", alert["generated_at"])
