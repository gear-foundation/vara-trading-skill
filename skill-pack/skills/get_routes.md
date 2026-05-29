# get_routes

Use this skill when the user wants to know how they can buy or sell an asset through the active CEX providers.

## Command

```bash
vara-agent routes --side "{{side}}" --asset "{{asset}}" --quote "{{quote}}" --amount "{{amount}}"
```

## Required Input

- `side`: buy or sell
- `asset`: base asset, for example VARA, USDC, BTC, ETH
- `quote`: quote asset, for example USDT
- `amount`: amount in quote currency

## Output

Returns available CEX execution routes for the requested asset/quote pair.

Run `check-market` before execution to confirm the pair exists and is active on the selected exchange.
