# get_orders

Use this skill when the user wants to see recent exchange orders or count open and closed orders.

## Command

```bash
vara-agent orders --provider "{{provider}}" --symbols "{{symbols}}" --limit "{{limit}}"
```

If `symbols` is omitted, the CLI uses onboarding allowed pairs.

## Required Input

- `provider`: mexc or gateio
- `symbols`: optional comma-separated market symbols, for example VARA/USDT,USDC/USDT
- `limit`: maximum orders per symbol, usually 20 or 50

## Output

Returns JSON with grouped counts and order lists:

- open_orders
- closed_orders
- canceled_orders
- other_orders

Do not expose API keys or secrets.
