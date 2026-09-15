from app.services.exchange_matcher import find_exchange
from app.services.risk_scoring import calculate_risk
from app.services.alert_generator import generate_alert

from app.services.patterns.fanout import detect_fan_out
from app.services.patterns.fanin import detect_fan_in
from app.services.patterns.layering import detect_layering
from app.services.patterns.peeling import detect_peeling
from app.services.patterns.round_trip import detect_round_trip
from app.services.nearest_vasp import find_nearest_vasp

def run_analysis(wallet_address, transactions):
    """
    Run complete wallet fraud analysis pipeline.
    """

    # 1. Exchange matching
    exchange_matches = find_exchange(wallet_address)

    # 2. Pattern detection
    findings = []

    fan_out = detect_fan_out(transactions)
    fan_in = detect_fan_in(transactions)
    layering = detect_layering(transactions)
    peeling = detect_peeling(transactions)
    round_trip = detect_round_trip(transactions)

    findings.extend(fan_out)
    findings.extend(fan_in)
    findings.extend(layering)
    findings.extend(peeling)
    findings.extend(round_trip)

   # 3. Nearest Exchange / VASP identification
    nearest_vasp = find_nearest_vasp(
    wallet_address,
    transactions,
    max_hops=3
     )

    # 3. Risk scoring
    risk_result = calculate_risk(
        findings,
        exchange_matches
    )

    # 4. Alert generation
    alert = generate_alert(
        wallet_address,
        risk_result,
        exchange_matches
    )

    # 5. Final result
    return {
        "wallet_address": wallet_address.lower(),
        "exchange_matches": exchange_matches,
        "nearest_vasp": nearest_vasp,
        "pattern_findings": findings,
        "risk": risk_result,
        "alert": alert
    }
