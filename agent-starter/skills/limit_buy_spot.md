# limit_buy_spot

Use this skill only when the user explicitly asks to place or simulate a limit buy for a spot pair.

## Required Input

- `provider`: mexc or gateio
- `symbol`: for example VARA/USDT, USDC/USDT, BTC/USDT
- `quote_amount`: amount of quote currency to spend
- `price`: limit price in quote currency
- `mode`: dry-run or live

## Command

```bash
vara-agent limit-buy --provider "{{provider}}" --symbol "{{symbol}}" --quote-amount "{{quote_amount}}" --price "{{price}}" --mode "{{mode}}"
```

## Safety

- Prefer dry-run by default.
- Live mode requires explicit user instruction.
- Live mode requires the pair and assets to be allowed by onboarding risk limits.
- Never infer a limit order from analysis.
- Never ask for API secrets in chat.
- Never print API secrets.
