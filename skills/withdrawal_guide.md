# withdrawal_guide

Use this skill when the user asks how withdrawals work or how to enable withdrawal capability.

## Command

```bash
vara-agent withdrawal-guide --provider "{{provider}}" --asset "{{asset}}" --network "{{network}}" --amount "{{amount}}" --address-confirmed
```

## Required Input

- `provider`: mexc or gateio
- `asset`: asset to withdraw
- `network`: withdrawal network
- `amount`: amount to withdraw

## Safety

- API withdrawals are disabled by default.
- Trading API keys should not have withdrawal permission.
- Live withdrawals require dedicated withdrawal keys, address allowlists, per-asset limits, `--address-confirmed`, and `--confirm-withdrawal`.
- Never ask for API secrets in chat.
