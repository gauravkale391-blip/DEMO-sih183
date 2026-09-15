import json
from pathlib import Path


DATA_FILE = (
    Path(__file__).resolve().parents[3]
    / "data"
    / "exchanges"
    / "ethereum_exchanges.json"
)


def load_exchange_data():

    with open(DATA_FILE, "r") as file:
        return json.load(file)


def find_exchange(wallet_address: str):

    wallet = wallet_address.lower()

    exchanges = load_exchange_data()

    matches = []

    for exchange in exchanges:

        for address in exchange.get("addresses", []):

            if address.lower() == wallet:

                matches.append({
                    "exchange": exchange["name"],
                    "type": exchange["type"],
                    "chain": exchange["chain"],
                    "matched_address": address
                })

    return matches
