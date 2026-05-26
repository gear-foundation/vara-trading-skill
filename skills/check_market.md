# check_market

Use this skill before trading to verify whether a market exists and is active on a CEX provider.

## Command

```bash
vara-agent check-market --provider "{{provider}}" --symbol "{{symbol}}"
```

## Required Input

- `provider`: mexc or gateio
- `symbol`: for example VARA/USDT or USDC/USDT

## Output

Returns JSON with:

- whether the market exists
- whether the market is active
- market limits
- market precision
