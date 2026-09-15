import asyncio

from app.services.tracing.trace_engine import trace_wallet


async def main():

    wallet = "0x1234567890123456789012345678901234567890"

    result = await trace_wallet(wallet, max_hops=2)

    print("Root Wallet:", result["root_wallet"])
    print("Wallets Analyzed:", result["wallets_analyzed"])

    print("\n========== TRACE GRAPH ==========")

    for wallet, data in result["graph"].items():

        print(f"\nWallet: {wallet}")
        print(f"Hop: {data['hop']}")
        print(f"Connected: {len(data['connected_wallets'])}")

        for connected in data["connected_wallets"][:5]:
            print("  ->", connected)


asyncio.run(main())
