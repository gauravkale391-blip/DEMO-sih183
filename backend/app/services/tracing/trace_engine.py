from app.services.blockchain.etherscan import get_transactions


async def get_connected_wallets(wallet_address: str):
    transactions = await get_transactions(wallet_address)

    connected_wallets = set()
    target = wallet_address.lower()

    for tx in transactions:
        sender = tx.get("from")
        receiver = tx.get("to")

        if not sender or not receiver:
            continue

        if sender.lower() == target:
            connected_wallets.add(receiver)

        elif receiver.lower() == target:
            connected_wallets.add(sender)

    return list(connected_wallets)


async def trace_wallet(wallet_address: str, max_hops: int = 2):

    visited = set()
    graph = {}
    all_transactions = []

    current_level = [wallet_address]

    for hop in range(1, max_hops + 1):

        next_level = []

        for wallet in current_level:

            wallet_lower = wallet.lower()

            if wallet_lower in visited:
                continue

            visited.add(wallet_lower)

            transactions = await get_transactions(wallet)

            all_transactions.extend(transactions)

            connected = set()

            for tx in transactions:
                sender = tx.get("from")
                receiver = tx.get("to")

                if not sender or not receiver:
                    continue

                if sender.lower() == wallet_lower:
                    connected.add(receiver)

                elif receiver.lower() == wallet_lower:
                    connected.add(sender)

            connected = list(connected)

            graph[wallet] = {
                "hop": hop,
                "connected_wallets": connected
            }

            for connected_wallet in connected:

                if connected_wallet.lower() not in visited:
                    next_level.append(connected_wallet)

        current_level = next_level

        if not current_level:
            break

    return {
        "root_wallet": wallet_address,
        "max_hops": max_hops,
        "wallets_analyzed": len(visited),
        "graph": graph,
        "transactions": all_transactions
    }
