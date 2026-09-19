from collections import defaultdict


def detect_layering(
    transactions,
    root_wallet=None,
    min_hops=3,
    max_findings=50
):
    """
    Detect unique sequential fund-flow paths.

    Example:
        A -> B -> C -> D

    A 3-hop path is treated as a layering indicator.

    Detection is root-centric when root_wallet
    is supplied.
    """

    graph = defaultdict(set)

    for tx in transactions:
        sender = tx.get("from")
        receiver = tx.get("to")

        if not sender or not receiver:
            continue

        sender = sender.lower()
        receiver = receiver.lower()

        if sender == receiver:
            continue

        graph[sender].add(receiver)

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

    def dfs(wallet, path, visited):
        if len(findings) >= max_findings:
            return

        hops = len(path) - 1

        if hops >= min_hops:
            path_key = tuple(path)

            if path_key not in seen_paths:
                seen_paths.add(path_key)

                findings.append({
                    "pattern": "LAYERING",
                    "start_wallet": path[0],
                    "wallet": path[0],
                    "hops": hops,
                    "path": path.copy()
                })

            # Do not count every longer prefix
            # as another layering finding.
            return

        for next_wallet in graph.get(
            wallet,
            set()
        ):
            if next_wallet in visited:
                continue

            visited.add(next_wallet)
            path.append(next_wallet)

            dfs(
                next_wallet,
                path,
                visited
            )

            path.pop()
            visited.remove(next_wallet)

            if len(findings) >= max_findings:
                return

    for start_wallet in start_wallets:
        dfs(
            start_wallet,
            [start_wallet],
            {start_wallet}
        )

        if len(findings) >= max_findings:
            break

    return findings
