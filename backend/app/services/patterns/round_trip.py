from collections import defaultdict


def detect_round_trip(
    transactions,
    root_wallet=None,
    min_hops=3,
    max_hops=6,
    max_findings=25
):
    """
    Detect unique directed round-trip fund movement.

    Example:
        A -> B -> C -> A

    Detection is root-centric when root_wallet
    is provided.
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
    seen_cycles = set()

    def canonical_cycle(path):
        """
        Produce a canonical representation so the
        same cycle is not counted multiple times.
        """

        cycle = path[:-1]

        if not cycle:
            return tuple()

        rotations = []

        for index in range(len(cycle)):
            rotation = (
                cycle[index:]
                + cycle[:index]
            )

            rotations.append(
                tuple(rotation)
            )

        return min(rotations)

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
        start_wallet,
        wallet,
        path,
        visited
    ):
        if len(findings) >= max_findings:
            return

        current_hops = len(path) - 1

        if current_hops >= max_hops:
            return

        for next_wallet in graph.get(
            wallet,
            set()
        ):
            if next_wallet == start_wallet:
                cycle_path = (
                    path
                    + [start_wallet]
                )

                hops = len(cycle_path) - 1

                if hops >= min_hops:
                    cycle_key = canonical_cycle(
                        cycle_path
                    )

                    if cycle_key not in seen_cycles:
                        seen_cycles.add(
                            cycle_key
                        )

                        findings.append({
                            "pattern":
                                "ROUND_TRIP",
                            "start_wallet":
                                start_wallet,
                            "wallet":
                                start_wallet,
                            "hops":
                                hops,
                            "path":
                                cycle_path
                        })

                continue

            if next_wallet in visited:
                continue

            visited.add(next_wallet)

            dfs(
                start_wallet,
                next_wallet,
                path + [next_wallet],
                visited
            )

            visited.remove(next_wallet)

            if len(findings) >= max_findings:
                return

    for start_wallet in start_wallets:
        dfs(
            start_wallet,
            start_wallet,
            [start_wallet],
            {start_wallet}
        )

        if len(findings) >= max_findings:
            break

    return findings
