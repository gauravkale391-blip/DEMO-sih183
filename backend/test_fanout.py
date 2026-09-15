from app.services.patterns.fanout import detect_fan_out


transactions = [
    {
        "from": "0xAAA",
        "to": "0x111"
    },
    {
        "from": "0xAAA",
        "to": "0x222"
    },
    {
        "from": "0xAAA",
        "to": "0x333"
    },
    {
        "from": "0xBBB",
        "to": "0x444"
    }
]


results = detect_fan_out(transactions, threshold=3)

print("Fan-out findings:", len(results))

for result in results:
    print("\nPattern:", result["pattern"])
    print("Wallet:", result["wallet"])
    print("Destinations:", result["unique_destinations"])

    for destination in result["destinations"]:
        print("  ->", destination)
