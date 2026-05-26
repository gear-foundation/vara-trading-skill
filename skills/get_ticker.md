# get_ticker

Use this skill when the user asks for current market data for a spot pair on a CEX provider.

## Required Input

- `provider`: mexc or gateio
- `symbol`: spot market symbol, for example VARA/USDT

## Command

```bash
vara-agent ticker --provider "{{provider}}" --symbol "{{symbol}}"
```
