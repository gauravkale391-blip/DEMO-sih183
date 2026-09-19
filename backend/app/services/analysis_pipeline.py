from app.services.exchange_matcher import find_exchange
from app.services.risk_scoring import calculate_risk
from app.services.alert_generator import generate_alert

from app.services.patterns.fanout import detect_fan_out
from app.services.patterns.fanin import detect_fan_in
from app.services.patterns.layering import detect_layering
from app.services.patterns.peeling import detect_peeling
from app.services.patterns.round_trip import detect_round_trip

from app.services.nearest_vasp import find_nearest_vasp
from app.services.clustering.wallet_cluster import build_wallet_cluster


PATTERN_LIMITS = {
    "FAN_OUT": 50,
    "FAN_IN": 50,
    "LAYERING": 50,
    "PEELING_CHAIN": 25,
    "ROUND_TRIP": 25,
}


def deduplicate_transactions(transactions):
    unique_transactions = []
    seen = set()

    for tx in transactions:
        tx_hash = (
            tx.get("hash")
            or tx.get("transactionHash")
        )

        if tx_hash:
            key = (
                "HASH",
                str(tx_hash).lower()
            )
        else:
            key = (
                "TX",
                str(tx.get("from", "")).lower(),
                str(tx.get("to", "")).lower(),
                str(tx.get("value", "")),
                str(tx.get("timeStamp", "")),
                str(tx.get("blockNumber", "")),
                str(tx.get("transactionIndex", "")),
                str(tx.get("nonce", ""))
            )

        if key in seen:
            continue

        seen.add(key)
        unique_transactions.append(tx)

    return unique_transactions


def build_pattern_summary(
    fan_out,
    fan_in,
    layering,
    peeling,
    round_trip
):
    raw = {
        "FAN_OUT": fan_out,
        "FAN_IN": fan_in,
        "LAYERING": layering,
        "PEELING_CHAIN": peeling,
        "ROUND_TRIP": round_trip,
    }

    summary = []

    for pattern, items in raw.items():
        limit = PATTERN_LIMITS[pattern]

        summary.append({
            "pattern": pattern,
            "findings_returned": min(
                len(items),
                limit
            ),
            "limit": limit,
            "limit_reached": (
                len(items) >= limit
            )
        })

    return summary


def run_analysis(wallet_address, transactions):
    """
    Run complete ShadowTrace fraud analysis pipeline.
    """

    # 1. Deduplicate trace transactions
    unique_transactions = deduplicate_transactions(
        transactions
    )

    # 2. Direct Exchange / VASP match
    exchange_matches = find_exchange(
        wallet_address
    )

    # 3. Pattern detection
    fan_out_all = detect_fan_out(
        unique_transactions
    )

    fan_in_all = detect_fan_in(
        unique_transactions
    )

    fan_out = fan_out_all[
        :PATTERN_LIMITS["FAN_OUT"]
    ]

    fan_in = fan_in_all[
        :PATTERN_LIMITS["FAN_IN"]
    ]

    layering = detect_layering(
        unique_transactions,
        root_wallet=wallet_address,
        max_findings=
            PATTERN_LIMITS["LAYERING"]
    )

    peeling = detect_peeling(
        unique_transactions,
        root_wallet=wallet_address,
        max_findings=
            PATTERN_LIMITS["PEELING_CHAIN"]
    )

    round_trip = detect_round_trip(
        unique_transactions,
        root_wallet=wallet_address,
        max_findings=
            PATTERN_LIMITS["ROUND_TRIP"]
    )

    findings = []

    findings.extend(fan_out)
    findings.extend(fan_in)
    findings.extend(layering)
    findings.extend(peeling)
    findings.extend(round_trip)

    pattern_summary = build_pattern_summary(
        fan_out_all,
        fan_in_all,
        layering,
        peeling,
        round_trip
    )

    # 4. Nearest Exchange / VASP
    nearest_vasp = find_nearest_vasp(
        wallet_address,
        unique_transactions,
        max_hops=3
    )

    # 5. Behavioral clustering
    wallet_cluster = build_wallet_cluster(
        wallet_address,
        unique_transactions,
        nearest_vasp
    )

    # 6. Risk scoring
    risk_result = calculate_risk(
        findings,
        exchange_matches
    )

    # 7. Alert
    alert = generate_alert(
        wallet_address,
        risk_result,
        exchange_matches
    )

    received_count = len(transactions)
    unique_count = len(unique_transactions)

    return {
        "wallet_address":
            wallet_address.lower(),

        "transaction_summary": {
            "received_transactions":
                received_count,

            "unique_transactions":
                unique_count,

            "duplicates_removed":
                max(
                    received_count
                    - unique_count,
                    0
                )
        },

        "exchange_matches":
            exchange_matches,

        "nearest_vasp":
            nearest_vasp,

        "wallet_cluster":
            wallet_cluster,

        "pattern_summary":
            pattern_summary,

        "pattern_findings":
            findings,

        "risk":
            risk_result,

        "alert":
            alert
    }
