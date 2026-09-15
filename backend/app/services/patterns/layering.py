def detect_layering(transactions, min_hops=3):
    """
    Detect sequential wallet-to-wallet fund movement.

    Example:
    A -> B -> C -> D

    This represents 3 hops.
    """

    graph = {}

    for tx in transactions:
        sender = tx.get("from")
        receiver = tx.get("to")

        if not sender or not receiver:
            continue

        sender = sender.lower()
        receiver = receiver.lower()

        if sender not in graph:
            graph[sender] = []

        graph[sender].append(receiver)

    findings = []

    def dfs(wallet, path, visited):

        if len(path) - 1 >= min_hops:
            findings.append({
                "pattern": "LAYERING",
                "start_wallet": path[0],
                "hops": len(path) - 1,
                "path": path.copy()
            })

        if wallet not in graph:
            return

        for next_wallet in graph[wallet]:

            if next_wallet in visited:
                continue

            visited.add(next_wallet)
            path.append(next_wallet)

            dfs(next_wallet, path, visited)

            path.pop()
            visited.remove(next_wallet)

    for wallet in graph:

        dfs(
            wallet,
            [wallet],
            {wallet}
        )

    return findings
