from app.services.patterns.fanin import detect_fan_in


transactions = [
    {"from": "0x111", "to": "0xAAA"},
    {"from": "0x222", "to": "0xAAA"},
    {"from": "0x333", "to": "0xAAA"},
    {"from": "0xBBB", "to": "0x444"},
]


results = detect_fan_in(transactions, threshold=3)

print("Fan-in findings:", len(results))

for result in results:
    print("\nPattern:", result["pattern"])
    print("Wallet:", result["wallet"])
    print("Sources:", result["unique_sources"])

    for source in result["sources"]:
        print("  <-", source)
