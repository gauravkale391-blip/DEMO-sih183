from app.services.exchange_matcher import find_exchange


wallet = "0x1111111111111111111111111111111111111111"

matches = find_exchange(wallet)

print("Matches found:", len(matches))

for match in matches:
    print("\nExchange:", match["exchange"])
    print("Type:", match["type"])
    print("Chain:", match["chain"])
    print("Address:", match["matched_address"])
