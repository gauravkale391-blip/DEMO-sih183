def detect_fan_in(transactions, threshold=3):
    """
    Detect whether multiple wallets send funds
    to the same wallet.
    """

    incoming = {}

    for tx in transactions:
        sender = tx.get("from")
        receiver = tx.get("to")

        if not sender or not receiver:
            continue

        sender = sender.lower()
        receiver = receiver.lower()

        if receiver not in incoming:
            incoming[receiver] = set()

        incoming[receiver].add(sender)

    findings = []

    for receiver, senders in incoming.items():

        if len(senders) >= threshold:
            findings.append({
                "pattern": "FAN_IN",
                "wallet": receiver,
                "unique_sources": len(senders),
                "sources": list(senders)
            })

    return findings
