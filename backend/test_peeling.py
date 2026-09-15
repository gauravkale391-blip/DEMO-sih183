from app.services.patterns.peeling import detect_peeling

transactions = [
    {"from": "0xAAA", "to": "0xBBB", "value": 100},
    {"from": "0xBBB", "to": "0xCCC", "value": 85},
    {"from": "0xCCC", "to": "0xDDD", "value": 70},
    {"from": "0xDDD", "to": "0xEEE", "value": 55},
]

results = detect_peeling(transactions, min_chain_length=3)

print("Peeling findings:", len(results))

for result in results:
    print("\nPattern:", result["pattern"])
    print("Start Wallet:", result["start_wallet"])
    print("Hops:", result["hops"])

    print("Path:")
    for wallet in result["path"]:
        print("  ->", wallet)

    print("Values:", result["values"])
