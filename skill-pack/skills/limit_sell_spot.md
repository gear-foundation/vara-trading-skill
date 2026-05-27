# limit_sell_spot

Use this skill only when the user explicitly asks to place or simulate a limit sell for a spot pair.

## Required Input

- `provider`: mexc or gateio
- `symbol`: for example VARA/USDT, USDC/USDT, BTC/USDT
- `base_amount`: amount of base asset to sell
- `price`: limit price in quote currency
- `mode`: dry-run or live

## Command

```bash
vara-agent limit-sell --provider "{{provider}}" --symbol "{{symbol}}" --base-amount "{{base_amount}}" --price "{{price}}" --mode "{{mode}}"
```

## Safety

- Prefer dry-run by default.
- Live mode requires explicit user instruction.
- Live mode requires the pair and assets to be allowed by onboarding risk limits.
- Never infer a limit order from analysis.
- Never sell without explicit amount and price.
- Never ask for API secrets in chat.
- Never print API secrets.
