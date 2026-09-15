from app.services.analysis_pipeline import run_analysis


wallet = "0x1111111111111111111111111111111111111111"


transactions = [
    {
        "from": "0xAAA",
        "to": "0xBBB",
        "value": 100
    },
    {
        "from": "0xBBB",
        "to": "0xCCC",
        "value": 85
    },
    {
        "from": "0xCCC",
        "to": "0xDDD",
        "value": 70
    },
    {
        "from": "0xDDD",
        "to": "0xAAA",
        "value": 55
    }
]


result = run_analysis(
    wallet,
    transactions
)


print("\n==============================")
print("     WALLET ANALYSIS")
print("==============================")

print("\nWallet:")
print(result["wallet_address"])


print("\nExchange Matches:")
for exchange in result["exchange_matches"]:
    print(" -", exchange["exchange"])


print("\nDetected Patterns:")
for finding in result["pattern_findings"]:
    print(" -", finding["pattern"])


print("\nRisk Score:")
print(result["risk"]["risk_score"])


print("\nRisk Level:")
print(result["risk"]["risk_level"])


print("\nAlert:")
print(result["alert"]["alert_type"])

print("Severity:")
print(result["alert"]["severity"])

print("\n==============================")
