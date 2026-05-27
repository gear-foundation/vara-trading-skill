# withdrawal_check

Use this skill before any withdrawal to inspect exchange support, balance, currency metadata, network metadata, and local withdrawal configuration.

## Command

```bash
vara-agent withdrawal-check --provider "{{provider}}" --asset "{{asset}}" --network "{{network}}" --amount "{{amount}}" --address "{{address}}"
```

## Required Input

- `provider`: mexc or gateio
- `asset`: asset to withdraw
- `network`: withdrawal network
- `amount`: amount to withdraw
- `address`: destination address

## Output

Returns JSON with:

- local withdrawal config snapshot
- masked destination address
- withdrawal support flag
- exchange currency metadata
- selected network metadata when available
- balance for the asset

## Safety

This command does not submit a withdrawal.
