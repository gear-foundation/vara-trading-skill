# get_vara_routes

Use this skill when the user wants to know how they can buy or sell VARA.

## Command

```bash
vara-agent routes --side "{{side}}" --quote "{{quote}}" --amount "{{amount}}"
```

## Required Input

- `side`: buy or sell
- `quote`: USDT for the active first release
- `amount`: amount in quote currency

## Output

Returns available active execution routes:

- MEXC CEX route, when allowed
- Gate.io CEX route, when allowed
