from app.services.patterns.round_trip import detect_round_trip

transactions = [
    {"from": "0xAAA", "to": "0xBBB"},
    {"from": "0xBBB", "to": "0xCCC"},
    {"from": "0xCCC", "to": "0xAAA"},
]

results = detect_round_trip(transactions)

print("Round-trip findings:", len(results))

for result in results:
    print("\nPattern:", result["pattern"])
    print("Start Wallet:", result["start_wallet"])
    print("Hops:", result["hops"])

    print("Path:")
    for wallet in result["path"]:
        print("  ->", wallet)
