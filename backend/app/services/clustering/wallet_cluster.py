from collections import defaultdict


def build_wallet_cluster(
    root_wallet: str,
    transactions: list,
    nearest_vasp: dict | None = None,
    max_members: int = 20
):
    """
    Build a behavioral relationship cluster around
    the reported suspect wallet.

    IMPORTANT:
    This does NOT claim common ownership.
    It groups wallets based on observable transaction
    relationships and fund-flow behavior.
    """

    root = root_wallet.lower()

    outgoing = defaultdict(set)
    incoming = defaultdict(set)

    all_wallets = set()

    for tx in transactions:
        sender = tx.get("from")
        receiver = tx.get("to")

        if not sender or not receiver:
            continue

        sender = sender.lower()
        receiver = receiver.lower()

        if sender == receiver:
            continue

        outgoing[sender].add(receiver)
        incoming[receiver].add(sender)

        all_wallets.add(sender)
        all_wallets.add(receiver)

    candidates = {}

    def add_score(wallet, score, reason):
        wallet = wallet.lower()

        if wallet == root:
            return

        if wallet not in candidates:
            candidates[wallet] = {
                "wallet": wallet,
                "score": 0,
                "reasons": []
            }

        candidates[wallet]["score"] += score

        if reason not in candidates[wallet]["reasons"]:
            candidates[wallet]["reasons"].append(reason)

    # -------------------------------------------------
    # HEURISTIC 1:
    # Direct transaction relationship with suspect
    # -------------------------------------------------

    for wallet in outgoing.get(root, set()):
        add_score(
            wallet,
            3,
            "Direct outgoing transaction from suspect wallet"
        )

    for wallet in incoming.get(root, set()):
        add_score(
            wallet,
            2,
            "Direct incoming transaction to suspect wallet"
        )

    # -------------------------------------------------
    # HEURISTIC 2:
    # Shared downstream destination
    # -------------------------------------------------

    root_destinations = outgoing.get(root, set())

    for wallet in all_wallets:
        if wallet == root:
            continue

        shared_destinations = (
            outgoing.get(wallet, set())
            & root_destinations
        )

        if shared_destinations:
            add_score(
                wallet,
                2,
                "Shared downstream transaction destination"
            )

    # -------------------------------------------------
    # HEURISTIC 3:
    # Shared upstream source
    # -------------------------------------------------

    root_sources = incoming.get(root, set())

    for wallet in all_wallets:
        if wallet == root:
            continue

        shared_sources = (
            incoming.get(wallet, set())
            & root_sources
        )

        if shared_sources:
            add_score(
                wallet,
                2,
                "Shared upstream transaction source"
            )

    # -------------------------------------------------
    # HEURISTIC 4:
    # Wallet appears in nearest-VASP path
    # -------------------------------------------------

    vasp_path = []

    if nearest_vasp:
        vasp_path = nearest_vasp.get("path", []) or []

    normalized_vasp_path = [
        str(wallet).lower()
        for wallet in vasp_path
    ]

    for index, wallet in enumerate(normalized_vasp_path):
        if wallet == root:
            continue

        is_last = (
            index == len(normalized_vasp_path) - 1
        )

        if is_last:
            add_score(
                wallet,
                2,
                "Known Exchange/VASP endpoint in traced path"
            )
        else:
            add_score(
                wallet,
                4,
                "Intermediary wallet in traced fund-flow path"
            )

    # -------------------------------------------------
    # Keep stronger relationships only
    # -------------------------------------------------

    members = [
        data
        for data in candidates.values()
        if data["score"] >= 2
    ]

    members.sort(
        key=lambda item: item["score"],
        reverse=True
    )

    members = members[:max_members]

    cluster_wallets = [
        root,
        *[
            member["wallet"]
            for member in members
        ]
    ]

    # -------------------------------------------------
    # Overall confidence
    # -------------------------------------------------

    if not members:
        confidence = "LOW"

    else:
        strongest_score = max(
            member["score"]
            for member in members
        )

        if strongest_score >= 6:
            confidence = "HIGH"

        elif strongest_score >= 4:
            confidence = "MEDIUM"

        else:
            confidence = "LOW"

    cluster_reasons = []

    reason_set = set()

    for member in members:
        for reason in member["reasons"]:
            reason_set.add(reason)

    cluster_reasons.extend(
        sorted(reason_set)
    )

    cluster_id = (
        f"CLUSTER-{root[2:10].upper()}"
        if root.startswith("0x")
        else f"CLUSTER-{root[:8].upper()}"
    )

    return {
        "cluster_found": len(members) > 0,
        "cluster_id": cluster_id,
        "cluster_type": "BEHAVIORAL_RELATIONSHIP",
        "root_wallet": root,
        "cluster_size": len(cluster_wallets),
        "confidence": confidence,
        "wallets": cluster_wallets,
        "members": members,
        "reasons": cluster_reasons,
        "disclaimer": (
            "Behavioral clustering indicates transaction "
            "relationships only and does not prove common ownership."
        )
    }
