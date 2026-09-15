from app.services.patterns.layering import detect_layering


transactions = [
    {
        "from": "0xAAA",
        "to": "0xBBB"
    },
    {
        "from": "0xBBB",
        "to": "0xCCC"
    },
    {
        "from": "0xCCC",
        "to": "0xDDD"
    },
    {
        "from": "0xDDD",
        "to": "0xEEE"
    }
]


results = detect_layering(
    transactions,
    min_hops=3
)


print("Layering findings:", len(results))


for result in results:

    print("\nPattern:", result["pattern"])
    print("Start Wallet:", result["start_wallet"])
    print("Hops:", result["hops"])
    print("Path:")

    for wallet in result["path"]:
        print("  ->", wallet)
