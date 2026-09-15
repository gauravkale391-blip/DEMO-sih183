from app.services.nearest_vasp import find_nearest_vasp


root = "0x1111111111111111111111111111111111111111"

middle = "0x2222222222222222222222222222222222222222"

exchange = "0x3333333333333333333333333333333333333333"


transactions = [
    {
        "from": root,
        "to": middle
    },
    {
        "from": middle,
        "to": exchange
    }
]


result = find_nearest_vasp(
    root,
    transactions,
    max_hops=3
)

print(result)
