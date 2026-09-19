from collections import defaultdict


def detect_peeling(
    transactions,
    root_wallet=None,
    min_chain_length=3,
    min_ratio=0.50,
    max_ratio=0.98,
    max_findings=25
):
    """
    Detect possible peeling-chain behavior.

    Example:
        A -> B 100
        B -> C 90
        C -> D 80

    The continuing amount should gradually
    decrease and transactions should move
    forward in time.

    This is a heuristic indicator only.
    """

    graph = defaultdict(list)

    seen_transactions = set()

    for tx in transactions:
        sender = tx.get("from")
        receiver = tx.get("to")
        value = tx.get("value", 0)

        if not sender or not receiver:
            continue

        sender = sender.lower()
        receiver = receiver.lower()

        if sender == receiver:
            continue

        try:
            value = float(value)
        except (TypeError, ValueError):
            continue

        if value <= 0:
            continue

        try:
            timestamp = int(
                tx.get("timeStamp", 0)
                or 0
            )
        except (TypeError, ValueError):
            timestamp = 0

        tx_hash = (
            tx.get("hash")
            or tx.get("transactionHash")
        )

        key = (
            str(tx_hash).lower()
            if tx_hash
            else (
                sender,
                receiver,
                value,
                timestamp
            )
        )

        if key in seen_transactions:
            continue

        seen_transactions.add(key)

        graph[sender].append({
            "to": receiver,
            "value": value,
            "timestamp": timestamp
        })

    for wallet in graph:
        graph[wallet].sort(
            key=lambda item:
                item["timestamp"]
        )

    findings = []
    seen_paths = set()

    if root_wallet:
        root = root_wallet.lower()

        start_wallets = (
            [root]
            if root in graph
            else []
        )
    else:
        start_wallets = list(graph.keys())

    def dfs(
        wallet,
        path,
        values,
        last_timestamp,
        visited
    ):
        if len(findings) >= max_findings:
            return

        hops = len(path) - 1

        if hops >= min_chain_length:
            path_key = tuple(path)

            if path_key not in seen_paths:
                seen_paths.add(path_key)

                findings.append({
                    "pattern":
                        "PEELING_CHAIN",
                    "start_wallet":
                        path[0],
                    "wallet":
                        path[0],
                    "hops":
                        hops,
                    "path":
                        path.copy(),
                    "values":
                        values.copy()
                })

            # Stop here so longer extensions
            # are not repeatedly counted.
            return

        for edge in graph.get(
            wallet,
            []
        ):
            next_wallet = edge["to"]
            next_value = edge["value"]
            next_timestamp = edge[
                "timestamp"
            ]

            if next_wallet in visited:
                continue

            if (
                last_timestamp
                and next_timestamp
                and next_timestamp
                < last_timestamp
            ):
                continue

            if values:
                previous_value = values[-1]

                if previous_value <= 0:
                    continue

                ratio = (
                    next_value
                    / previous_value
                )

                if ratio < min_ratio:
                    continue

                if ratio > max_ratio:
                    continue

            visited.add(next_wallet)

            path.append(next_wallet)
            values.append(next_value)

            dfs(
                next_wallet,
                path,
                values,
                next_timestamp
                or last_timestamp,
                visited
            )

            values.pop()
            path.pop()

            visited.remove(next_wallet)

            if len(findings) >= max_findings:
                return

    for start_wallet in start_wallets:
        dfs(
            start_wallet,
            [start_wallet],
            [],
            None,
            {start_wallet}
        )

        if len(findings) >= max_findings:
            break

    return findings
