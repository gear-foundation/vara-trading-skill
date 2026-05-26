# withdraw_asset

Use this skill only when the user explicitly asks to withdraw funds now.

## Required Input

- `provider`: mexc or gateio
- `asset`: asset to withdraw
- `network`: withdrawal network
- `amount`: amount to withdraw
- `address`: destination address
- `tag`: optional memo/tag if required
- `mode`: dry-run or live

## Dry Run Command

```bash
vara-agent withdraw --provider "{{provider}}" --asset "{{asset}}" --network "{{network}}" --amount "{{amount}}" --address "{{address}}" --mode dry-run
```

## Live Command

```bash
vara-agent withdraw --provider "{{provider}}" --asset "{{asset}}" --network "{{network}}" --amount "{{amount}}" --address "{{address}}" --mode live --address-confirmed --confirm-withdrawal
```

## Safety

- Prefer dry-run first.
- Live withdrawal is irreversible once accepted by the exchange.
- Live withdrawal requires explicit user instruction.
- Live withdrawal requires `VARA_AGENT_ENABLE_WITHDRAWALS=true`.
- Live withdrawal requires dedicated withdrawal API keys.
- Live withdrawal requires the asset, network, address, and amount to pass local allowlists.
- Never infer a withdrawal from balance review or trading discussion.
- Never ask for API secrets in chat.
