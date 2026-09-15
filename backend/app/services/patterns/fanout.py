def detect_fan_out(transactions, threshold=3):
    """
    Detect whether one wallet sends funds
    to multiple unique wallets.
    """

    outgoing = {}

    for tx in transactions:
        sender = tx.get("from")
        receiver = tx.get("to")

        if not sender or not receiver:
            continue

        sender = sender.lower()
        receiver = receiver.lower()

        if sender not in outgoing:
            outgoing[sender] = set()

        outgoing[sender].add(receiver)

    findings = []

    for sender, receivers in outgoing.items():

        if len(receivers) >= threshold:
            findings.append({
                "pattern": "FAN_OUT",
                "wallet": sender,
                "unique_destinations": len(receivers),
                "destinations": list(receivers)
            })

    return findings
