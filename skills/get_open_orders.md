# get_open_orders

Use this skill when the user wants to inspect currently open exchange orders.

## Command

```bash
vara-agent open-orders --provider "{{provider}}" --symbols "{{symbols}}" --limit "{{limit}}"
```

If `symbols` is omitted, the CLI uses onboarding allowed pairs.

## Required Input

- `provider`: mexc or gateio
- `symbols`: optional comma-separated market symbols, for example VARA/USDT,USDC/USDT
- `limit`: maximum open orders per symbol, usually 20 or 50

## Output

Returns JSON with the open orders and per-symbol results.

Do not expose API keys or secrets.
