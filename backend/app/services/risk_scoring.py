def calculate_risk(pattern_findings, exchange_matches=None):
    """
    Calculate fraud risk score from detected patterns
    and exchange address matches.
    """

    score = 0
    reasons = []

    exchange_matches = exchange_matches or []

    weights = {
        "FAN_OUT": 15,
        "FAN_IN": 15,
        "LAYERING": 20,
        "PEELING_CHAIN": 20,
        "ROUND_TRIP": 25,
    }

    detected_patterns = set()

    for finding in pattern_findings:
        pattern = finding.get("pattern")

        if pattern in weights:
            detected_patterns.add(pattern)

    for pattern in detected_patterns:
        score += weights[pattern]
        reasons.append(
            f"{pattern} detected (+{weights[pattern]})"
        )

    # Exchange match is a strong indicator
    if exchange_matches:
        score += 30
        reasons.append("Known exchange address matched (+30)")

    # Cap score at 100
    score = min(score, 100)

    if score >= 70:
        risk_level = "HIGH"
    elif score >= 40:
        risk_level = "MEDIUM"
    else:
        risk_level = "LOW"

    return {
        "risk_score": score,
        "risk_level": risk_level,
        "reasons": reasons,
        "detected_patterns": list(detected_patterns),
    }
