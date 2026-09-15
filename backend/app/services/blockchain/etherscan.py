import httpx

from app.config import ETHERSCAN_API_KEY


BASE_URL = "https://api.etherscan.io/v2/api"


async def get_transactions(wallet_address: str):
    params = {
        "chainid": "1",
        "module": "account",
        "action": "txlist",
        "address": wallet_address,
        "startblock": 0,
        "endblock": 99999999,
        "page": 1,
        "offset": 100,
        "sort": "asc",
        "apikey": ETHERSCAN_API_KEY,
    }

    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.get(BASE_URL, params=params)
        response.raise_for_status()

        data = response.json()

    if data.get("status") == "0":
        return []

    return data.get("result", [])
