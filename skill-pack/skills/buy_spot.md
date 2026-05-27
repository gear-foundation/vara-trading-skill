# buy_spot

Use this skill only when the user explicitly asks to buy the base asset of a spot pair.

Do not use this skill for:

- market analysis
- hypothetical questions
- portfolio review
- general price discussion

## Required Input

- `provider`: mexc or gateio
- `symbol`: for example VARA/USDT, USDC/USDT, BTC/USDT
- `quote_amount`: amount of quote currency to spend
- `mode`: dry-run or live

## Command

```bash
vara-agent buy --provider "{{provider}}" --symbol "{{symbol}}" --quote-amount "{{quote_amount}}" --mode "{{mode}}"
```

## Safety

- Prefer dry-run by default.
- Live mode requires explicit user instruction.
- Live mode requires the pair and assets to be allowed by onboarding risk limits.
- Never infer a buy order from analysis.
- Never ask for API secrets in chat.
- Never print API secrets.
