# get_orderbook

Use this skill when the user wants to inspect the exchange order book for a spot market.

## Command

```bash
vara-agent orderbook --provider "{{provider}}" --symbol "{{symbol}}" --limit "{{limit}}"
```

## Required Input

- `provider`: mexc or gateio
- `symbol`: for example VARA/USDT or USDC/USDT
- `limit`: number of price levels, usually 5, 10, or 20

## Output

Returns JSON with:

- best bid and best ask
- spread and spread percentage
- bid levels
- ask levels

Use the ask side to estimate market buys and the bid side to estimate market sells.
