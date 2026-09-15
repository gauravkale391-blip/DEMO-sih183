def detect_round_trip(transactions, min_hops=2):
    """
    Detect round-trip fund movement.

    Example:
    A -> B -> C -> A

    The funds eventually return to the starting wallet.
    """

    graph = {}

    for tx in transactions:
        sender = tx.get("from")
        receiver = tx.get("to")

        if not sender or not receiver:
            continue

        sender = sender.lower()
        receiver = receiver.lower()

        graph.setdefault(sender, []).append(receiver)

    findings = []

    def dfs(start_wallet, wallet, path, visited):

        if len(path) - 1 >= min_hops and wallet == start_wallet:
            findings.append({
                "pattern": "ROUND_TRIP",
                "start_wallet": start_wallet,
                "hops": len(path) - 1,
                "path": path.copy()
            })
            return

        for next_wallet in graph.get(wallet, []):

            # Allow return to starting wallet
            if next_wallet == start_wallet:
                if len(path) - 1 >= min_hops:
                    dfs(
                        start_wallet,
                        next_wallet,
                        path + [next_wallet],
                        visited
                    )
                continue

            if next_wallet in visited:
                continue

            visited.add(next_wallet)
            path.append(next_wallet)

            dfs(start_wallet, next_wallet, path, visited)

            path.pop()
            visited.remove(next_wallet)

    for wallet in graph:
        dfs(wallet, wallet, [wallet], {wallet})

    return findings
