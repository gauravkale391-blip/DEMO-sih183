from collections import deque

from app.services.exchange_matcher import find_exchange


def find_nearest_vasp(
    root_wallet: str,
    transactions: list,
    max_hops: int = 3
):
    """
    Find the nearest known Exchange/VASP reachable
    from the suspect wallet by following outgoing
    fund-flow direction only:

        sender -> receiver

    Returns the nearest VASP along with the path
    from the reported wallet.
    """

    root = root_wallet.lower()

    # Build directed transaction graph
    adjacency = {}

    for tx in transactions:
        sender = tx.get("from")
        receiver = tx.get("to")

        if not sender or not receiver:
            continue

        sender = sender.lower()
        receiver = receiver.lower()

        if sender == receiver:
            continue

        if sender not in adjacency:
            adjacency[sender] = set()

        adjacency[sender].add(receiver)

    # BFS queue:
    # (wallet, hop_distance, path)
    queue = deque([
        (root, 0, [root])
    ])

    visited = {root}

    nearest_matches = []
    nearest_hop = None

    while queue:

        wallet, hop, path = queue.popleft()

        # Do not treat root wallet as destination VASP.
        if hop > 0:

            exchange_matches = find_exchange(wallet)

            if exchange_matches:

                # First VASP found by BFS defines nearest hop.
                if nearest_hop is None:
                    nearest_hop = hop

                # Once we have nearest hop,
                # ignore farther matches.
                if hop == nearest_hop:

                    for match in exchange_matches:

                        nearest_matches.append({
                            "exchange": match.get("exchange"),
                            "type": match.get("type"),
                            "chain": match.get("chain"),
                            "matched_address": match.get(
                                "matched_address"
                            ),
                            "hop_distance": hop,
                            "path": path,
                            "match_type":
                                "KNOWN_EXCHANGE_ADDRESS"
                        })

                continue

        # No need to search deeper than nearest match.
        if nearest_hop is not None:
            continue

        if hop >= max_hops:
            continue

        for neighbour in adjacency.get(wallet, set()):

            if neighbour in visited:
                continue

            visited.add(neighbour)

            queue.append(
                (
                    neighbour,
                    hop + 1,
                    path + [neighbour]
                )
            )

    if not nearest_matches:

        return {
            "vasp_found": False,
            "nearest_vasp": None,
            "hop_distance": None,
            "path": [],
            "matches": []
        }

    nearest = nearest_matches[0]

    return {
        "vasp_found": True,
        "nearest_vasp": {
            "exchange": nearest["exchange"],
            "type": nearest["type"],
            "chain": nearest["chain"],
            "matched_address":
                nearest["matched_address"],
            "match_type":
                nearest["match_type"]
        },
        "hop_distance":
            nearest["hop_distance"],
        "path":
            nearest["path"],
        "matches":
            nearest_matches
    }
