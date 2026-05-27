# sell_spot

Use this skill only when the user explicitly asks to sell the base asset of a spot pair.

## Required Input

- `provider`: mexc or gateio
- `symbol`: for example VARA/USDT, USDC/USDT, BTC/USDT
- `base_amount`: amount of base asset to sell
- `mode`: dry-run or live

## Command

```bash
vara-agent sell --provider "{{provider}}" --symbol "{{symbol}}" --base-amount "{{base_amount}}" --mode "{{mode}}"
```

## Safety

- Prefer dry-run by default.
- Live mode requires explicit user instruction.
- Live mode requires the pair and assets to be allowed by onboarding risk limits.
- Never infer a sell order from analysis.
- Never sell without explicit amount.
- Never ask for API secrets in chat.
- Never print API secrets.
