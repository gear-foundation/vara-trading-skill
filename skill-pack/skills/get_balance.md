# get_balance

Use this skill when the user asks to check balance on a configured CEX provider.

## Command

```bash
vara-agent balance --provider "{{provider}}"
```

## Required Input

- `provider`: mexc or gateio

## Output

Returns only non-zero balances as a compact summary. Do not present raw CCXT balance output unless the user explicitly asks for debugging details.

## Safety

- Do not request API keys in chat.
- Credentials must already exist in local config.
