# cancel_order

Use this skill only when the user explicitly asks to cancel a specific exchange order.

## Required Input

- `provider`: mexc or gateio
- `symbol`: market symbol, for example VARA/USDT
- `order_id`: exact exchange order id

## Command

```bash
vara-agent cancel-order --provider "{{provider}}" --symbol "{{symbol}}" --order-id "{{order_id}}" --confirm
```

## Safety

- Cancel only the exact order id named by the user.
- If the user has not provided an order id, show open orders first.
- Cancellation is a real exchange action.
- Never ask for API secrets in chat.
- Never print API secrets.
