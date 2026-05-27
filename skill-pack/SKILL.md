---
name: vara-trading-skill
description: "Use when an agent needs to set up or operate the local vara-agent CLI for CEX spot trading: onboarding, market checks, balances, tickers, order books, explicit dry-run/live spot orders, order history, cancellations, and explicitly confirmed withdrawals. Active first release supports MEXC and Gate.io. Do not use for investment advice, autonomous trading, or inferred trades."
license: MIT
metadata:
  author: gear-foundation
  version: "0.1.1"
---

# Local Spot Trading Skill

This skill package allows an AI agent to execute local CLI commands for CEX spot trading and routing actions. VARA remains a default route/example, but buy/sell commands support any active spot pair allowed by onboarding risk limits.

The project does not run a backend. All commands execute locally on the user's machine.

## Preamble

Run this check before using the skill:

```bash
if command -v vara-agent >/dev/null 2>&1; then
  echo "[PREFLIGHT] OK: vara-agent present ($(vara-agent --version 2>/dev/null || true))"
else
  echo "[PREFLIGHT] MISSING: vara-agent CLI is not on PATH."
  echo "[PREFLIGHT] Install: npm install -g vara-trading-skill"
  echo "[PREFLIGHT] Then restart the shell or agent session if PATH did not refresh."
fi
```

If `vara-agent` is missing, stop and ask the user for permission to install it. Do not ask for API keys in chat.

## Supported Integration Types

- Active CEX trading: MEXC, Gate.io
- Future CEX trading: Coinbase, Crypto.com
- Instant swap: Exolix, planned
- Fiat on-ramp: Banxa, planned
- Vara wallet: planned
- Route aggregator: basic route discovery implemented

## Security Rules

- Never ask the user to paste API secrets into chat.
- Never display API keys or API secrets.
- Before any live trading setup, run the onboarding wizard.
- The user must pass steps: Welcome, Choose Exchange, Setup Instructions, Connect Credentials, Risk Limits, Validation, Dry-run, Final Confirmation, Ready.
- The user must explicitly choose MEXC, Gate.io, or both before live trading.
- API credentials must be stored locally in `~/.vara-trading-agent/.env`.
- When reporting setup files to the user, show full paths such as `~/.vara-trading-agent/.env` and `~/.vara-trading-agent/onboarding.json`.
- If mentioning file mode `600`, explain it as owner-only read/write permissions.
- Trading API keys must have read + trade permissions only.
- Withdrawal permission must be disabled on trading API keys.
- API withdrawals are available only as explicit opt-in high-risk actions.
- Live API withdrawals require dedicated withdrawal API keys, local allowlists, per-asset limits, `--mode live`, `--address-confirmed`, and `--confirm-withdrawal`.
- Dry-run mode must be preferred by default.
- Live trading requires explicit user instruction.
- Never infer a trade from analysis or discussion.
- Only execute a buy/sell command when the user explicitly asks to trade now.
- Canceling an order requires an explicit order id and confirmation.
- Never provide investment advice. Market data and order books are evidence, not instructions to trade.

## Recipe Files

Read only the recipe needed for the user's request:

- `skills/install_agent.md` - install and connect this skill pack.
- `skills/onboarding.md` - first-time setup and exchange selection.
- `skills/check_market.md` - verify a market exists and inspect limits/precision.
- `skills/get_balance.md` - fetch account balances.
- `skills/get_ticker.md` - fetch ticker data.
- `skills/get_orderbook.md` - fetch order book depth.
- `skills/get_open_orders.md` - fetch active orders.
- `skills/get_orders.md` - fetch order history and status counts.
- `skills/cancel_order.md` - cancel an explicit order id.
- `skills/buy_spot.md`, `skills/sell_spot.md` - market spot orders.
- `skills/limit_buy_spot.md`, `skills/limit_sell_spot.md` - limit spot orders.
- `skills/withdrawal_guide.md`, `skills/withdrawal_check.md`, `skills/withdraw_asset.md` - explicit withdrawal flow.

## CLI

Use:

```bash
vara-agent <command>
```

## Agent-Led Interactive Setup

For first-time setup, prefer one continuous interactive session:

```bash
vara-agent init-config
vara-agent onboarding interactive
```

The agent should keep `vara-agent onboarding interactive` running, show the user the current prompt/options, accept the user's natural-language choice, and send the matching numeric answer to the CLI. Do not replace the interactive wizard with separate state commands such as `onboarding choose-integration` unless the user asks for non-interactive mode or the runtime cannot keep an interactive process open.

The wizard may pause at the credentials step because the user must create exchange API keys and edit `~/.vara-trading-agent/.env` locally. After the user says the keys are saved, continue the wizard from the existing state with `vara-agent onboarding interactive`.

Examples:

```bash
vara-agent onboarding interactive
vara-agent init-config
vara-agent install-skills
vara-agent onboarding
vara-agent onboarding understand
vara-agent onboarding choose-integration --integration mexc
vara-agent onboarding choose-integration --integration gateio
vara-agent onboarding choose-integration --integration both
vara-agent onboarding status
vara-agent routes --side buy --quote USDT --amount 20
vara-agent check-market --provider mexc --symbol VARA/USDT
vara-agent check-market --provider mexc --symbol USDC/USDT
vara-agent balance --provider mexc
vara-agent ticker --provider mexc --symbol VARA/USDT
vara-agent orderbook --provider mexc --symbol VARA/USDT --limit 10
vara-agent open-orders --provider mexc
vara-agent orders --provider mexc
vara-agent cancel-order --provider mexc --symbol VARA/USDT --order-id "<order-id>" --confirm
vara-agent withdrawal-guide --provider mexc --asset USDT --network TRC20 --amount 10 --address-confirmed
vara-agent withdrawal-check --provider mexc --asset USDT --network TRC20 --amount 10 --address "<address>"
vara-agent withdraw --provider mexc --asset USDT --network TRC20 --amount 10 --address "<address>" --mode dry-run
vara-agent buy --provider mexc --symbol VARA/USDT --quote-amount 10 --mode dry-run
vara-agent limit-buy --provider mexc --symbol VARA/USDT --quote-amount 2 --price 0.000605 --mode dry-run
vara-agent limit-sell --provider mexc --symbol VARA/USDT --base-amount 1000 --price 0.000604 --mode dry-run
vara-agent sell --provider mexc --symbol USDC/USDT --base-amount 10 --mode dry-run
vara-agent sell --provider mexc --symbol VARA/USDT --base-amount 100 --mode dry-run
```

Do not use live trading unless explicitly requested.

If the user says:

```text
Buy VARA for 10 USDT
```

the agent may call dry-run first, or live only if the user explicitly requests live execution and the pair is allowed.

If the user says:

```text
Swap 10 USDC to USDT on MEXC
```

the agent should treat it as a spot sell on `USDC/USDT`, preferably dry-run first.

If the user says:

```text
Do you think I should buy VARA?
```

the agent must not call buy commands.

## Onboarding

Before asking for any API key setup, use the wizard:

1. Welcome / Risk Warning
2. Choose Exchange: MEXC, Gate.io, or both
3. Show exchange-specific setup instructions
4. Connect credentials
5. Configure risk limits
6. Validate setup
7. Dry-run
8. Final confirmation
9. Ready

Supported active first release exchanges:

- MEXC
- Gate.io
- Both MEXC and Gate.io

Paper Trading, Exolix, Banxa, Wallet / DEX, Coinbase, and Crypto.com are kept as future plans.

For CEX trading, explain that the user must:

1. Log in to the exchange.
2. Create a dedicated API key for this agent.
3. Grant only the minimum read and trade permissions needed by that exchange.
4. Never grant Withdraw / Withdrawal permission to trading keys.
5. Store credentials locally in `~/.vara-trading-agent/.env`.
6. Use separate withdrawal keys only if API withdrawal is explicitly enabled by the user.

The agent may create `~/.vara-trading-agent/.env` and `~/.vara-trading-agent/onboarding.json` during setup. These are user-home config files, not project-local files. Do not call them just `.env` without the path.

Gate.io-specific setup:

- Open Security and set a Fund Password first.
- It protects fund security.
- Trading does not require fund password input by default.
- Open API Key Management.

MEXC-specific setup:

- Click the account icon.
- Select API Management.
- Enable Account Details.
- Enable Trade.
- Enable View Order Details.
- Link IP Address is optional.

Recommend IP whitelist when a fixed IP is available, trading limits, a separate subaccount, and keeping only funds the user is willing to trade.

Risk limits must list every live-tradable pair explicitly, for example `VARA/USDT,USDC/USDT`. The agent must not place a live order for a pair outside the configured allowed pairs.

Order management commands:

```bash
vara-agent open-orders --provider mexc --symbols VARA/USDT,USDC/USDT --limit 50
vara-agent orders --provider mexc --symbols VARA/USDT,USDC/USDT --limit 50
vara-agent cancel-order --provider mexc --symbol VARA/USDT --order-id "<order-id>" --confirm
```

Withdrawal guidance command:

```bash
vara-agent withdrawal-guide --provider mexc --asset USDT --network TRC20 --amount 10 --address-confirmed
vara-agent withdrawal-check --provider mexc --asset USDT --network TRC20 --amount 10 --address "<address>"
vara-agent withdraw --provider mexc --asset USDT --network TRC20 --amount 10 --address "<address>" --mode dry-run
```

Live withdrawal command:

```bash
vara-agent withdraw --provider mexc --asset USDT --network TRC20 --amount 10 --address "<address>" --mode live --address-confirmed --confirm-withdrawal
```

The agent may execute live API withdrawals only when the user explicitly asks for withdrawal now and the local config enables withdrawals with allowlisted assets, networks, addresses, and per-asset limits.

For future Exolix work, keep it separate from Exchange API trading. Explain that Exolix is an instant swap provider: create swap, receive deposit address, manually send funds, receive output, track status.
