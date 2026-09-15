def detect_peeling(transactions, min_chain_length=3, tolerance=0.15):
    """
    Detect peeling-chain behavior.

    Example:
    A -> B (100)
    B -> C (85)
    C -> D (70)
    D -> E (55)

    Each hop continues with a reduced amount.
    """

    graph = {}

    for tx in transactions:
        sender = tx.get("from")
        receiver = tx.get("to")
        value = tx.get("value", 0)

        if not sender or not receiver:
            continue

        try:
            value = float(value)
        except (TypeError, ValueError):
            continue

        sender = sender.lower()
        receiver = receiver.lower()

        graph.setdefault(sender, []).append({
            "to": receiver,
            "value": value
        })

    findings = []

    def dfs(wallet, path, values, visited):

        if len(path) - 1 >= min_chain_length:
            findings.append({
                "pattern": "PEELING_CHAIN",
                "start_wallet": path[0],
                "hops": len(path) - 1,
                "path": path.copy(),
                "values": values.copy()
            })

        for tx in graph.get(wallet, []):

            next_wallet = tx["to"]
            next_value = tx["value"]

            if next_wallet in visited:
                continue

            if values:
                previous_value = values[-1]

                if previous_value <= 0:
                    continue

                # Amount should decrease
                ratio = next_value / previous_value

                if ratio >= 1:
                    continue

                # Avoid extremely large drops
                if ratio < tolerance:
                    continue

            visited.add(next_wallet)
            path.append(next_wallet)
            values.append(next_value)

            dfs(next_wallet, path, values, visited)

            values.pop()
            path.pop()
            visited.remove(next_wallet)

    for wallet in graph:
        dfs(wallet, [wallet], [], {wallet})

    return findings
