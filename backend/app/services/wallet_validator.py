import re


def detect_chain(wallet_address: str) -> str:
    address = wallet_address.strip()

    # Ethereum / EVM
    if re.fullmatch(r"0x[a-fA-F0-9]{40}", address):
        return "EVM"

    # TRON
    if re.fullmatch(r"T[a-zA-Z0-9]{33}", address):
        return "TRON"

    return "UNKNOWN"
