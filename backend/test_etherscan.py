import asyncio

from app.services.blockchain.etherscan import get_transactions


async def main():
    wallet = "0x1234567890123456789012345678901234567890"

    transactions = await get_transactions(wallet)

    print(f"Transactions found: {len(transactions)}")

    for tx in transactions[:5]:
        print(
            tx.get("hash"),
            tx.get("from"),
            tx.get("to"),
            tx.get("value")
        )


asyncio.run(main())
