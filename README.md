# Spot Trading Skill

Local TypeScript CLI and skill package for CEX spot trading routes and exchange execution. VARA remains a default example, but trading commands can use any active spot pair supported by the selected exchange.

## Install

Install from npm without cloning the repository:

```bash
npm install -g vara-trading-skill
```

Install the agent skill pack from GitHub:

```bash
npx skills add https://github.com/gear-foundation/vara-trading-skill/tree/master/skill-pack -g --all -y
```

The GitHub skill pack lives in `skill-pack/`. The repository root is the npm/TypeScript CLI project.

Then restart your agent session if it does not pick up newly installed skills immediately.

## Start With An Agent

After installation, ask your agent:

```text
Use vara-trading-skill and set up local trading.
```

The agent should run the local setup commands:

```bash
vara-agent init-config
vara-agent onboarding interactive
```

The agent should keep the interactive wizard running and answer its prompts from the user's choices. It should not turn onboarding into separate one-command-per-step messages unless interactive terminal control is unavailable.

`init-config` creates `~/.vara-trading-agent/.env` if it does not exist. The agent may create the file, start onboarding, and validate setup, but it must never ask the user to paste API keys into chat. When credentials are needed, the user edits `~/.vara-trading-agent/.env` locally.

`npm install -g` installs the executable CLI. `npx skills add ...` installs `SKILL.md` and the recipe files into supported agent runtimes so the agent can discover `vara-trading-skill`.

If the user installed only the npm package and their agent supports Codex-style local skill directories, they can also run:

```bash
vara-agent install-skills
```

Restart the agent session after installing skills if the runtime does not pick up new skills immediately.

## Configure

The setup starts with the step-by-step onboarding wizard. The agent must explain setup choices before live trading:

```bash
vara-agent onboarding interactive
```

For non-interactive current-step output only when needed:

```bash
vara-agent onboarding
```

Continue through the wizard:

```bash
vara-agent onboarding understand
vara-agent onboarding choose-integration --integration mexc
vara-agent onboarding choose-integration --integration gateio
vara-agent onboarding choose-integration --integration both
```

For machine-readable output:

```bash
vara-agent onboarding --json
```

Active first release onboarding supports CEX trading on MEXC, Gate.io, or both. CEX live trading requires completing the full wizard, including checklist, local credentials, risk limits, validation, dry-run, and final confirmation. Coinbase, Crypto.com, Exolix, Banxa, and DEX/on-chain flows remain planned future integrations.

CEX local credential setup:

```bash
vara-agent init-config
```

`init-config` creates `~/.vara-trading-agent/.env` if it does not exist. If the file already exists, it leaves it unchanged.

Edit:

```text
~/.vara-trading-agent/.env
```

Trading API keys must have read + trade permissions only.

After CEX setup is complete:

```bash
vara-agent onboarding connect --credentials-local
vara-agent onboarding configure-risk --max-trade-size-usd 50 --allowed-assets VARA,USDT,USDC --allowed-pairs VARA/USDT,USDC/USDT --max-slippage-percent 1
vara-agent onboarding validate
vara-agent onboarding dry-run
vara-agent onboarding final-confirm --confirm
```

`--allowed-assets` is a comma-separated list of asset tickers, for example `VARA,USDT,USDC`.
`--allowed-pairs` is a comma-separated list of market symbols, for example `VARA/USDT,USDC/USDT`.

## Run

```bash
vara-agent init-config
vara-agent onboarding
vara-agent routes --side buy --quote USDT --amount 20
vara-agent check-market --provider mexc --symbol VARA/USDT
vara-agent ticker --provider mexc --symbol VARA/USDT
vara-agent orderbook --provider mexc --symbol VARA/USDT --limit 10
vara-agent balance --provider mexc
vara-agent open-orders --provider mexc
vara-agent orders --provider mexc
vara-agent withdrawal-guide --provider mexc --asset USDT --network TRC20 --amount 10 --address-confirmed
vara-agent buy --provider mexc --symbol VARA/USDT --quote-amount 10 --mode dry-run
vara-agent limit-buy --provider mexc --symbol VARA/USDT --quote-amount 2 --price 0.000605 --mode dry-run
vara-agent limit-sell --provider mexc --symbol VARA/USDT --base-amount 1000 --price 0.000604 --mode dry-run
vara-agent sell --provider mexc --symbol USDC/USDT --base-amount 10 --mode dry-run
```

## Withdrawal Flow

Withdrawals are supported as an explicit high-risk capability. They are disabled by default and require dedicated withdrawal API keys plus local allowlists.

Use `withdrawal-guide` to see the setup and risk checklist:

```bash
vara-agent withdrawal-guide --provider mexc --asset USDT --network TRC20 --amount 10 --address-confirmed
```

Use `withdrawal-check` before submitting anything:

```bash
vara-agent withdrawal-check --provider mexc --asset USDT --network TRC20 --amount 10 --address "<address>"
```

Dry-run a withdrawal:

```bash
vara-agent withdraw --provider mexc --asset USDT --network TRC20 --amount 10 --address "<address>" --mode dry-run
```

Live API withdrawal requires all of the following:

- `VARA_AGENT_ENABLE_WITHDRAWALS=true`
- dedicated withdrawal API key and secret, for example `MEXC_WITHDRAW_API_KEY` and `MEXC_WITHDRAW_API_SECRET`
- `VARA_AGENT_ALLOWED_WITHDRAW_ASSETS`
- `VARA_AGENT_ALLOWED_WITHDRAW_NETWORKS`
- `VARA_AGENT_ALLOWED_WITHDRAW_ADDRESSES`
- positive per-asset limit, for example `VARA_AGENT_MAX_WITHDRAW_USDT=25`
- explicit command flags `--mode live --address-confirmed --confirm-withdrawal`

Example live command:

```bash
vara-agent withdraw --provider mexc --asset USDT --network TRC20 --amount 10 --address "<address>" --mode live --address-confirmed --confirm-withdrawal
```

Withdrawals are irreversible once accepted by the exchange. Use address allowlists and a small test withdrawal first.

## Order Management

Use `open-orders` to see currently active exchange orders. Use `orders` to fetch recent order history and grouped counts for open, closed, canceled, and other statuses.

If `--symbols` is omitted, the CLI uses the allowed pairs configured in onboarding risk limits.

```bash
vara-agent open-orders --provider mexc --symbols VARA/USDT,USDC/USDT --limit 50
vara-agent orders --provider mexc --symbols VARA/USDT,USDC/USDT --limit 50
```

Canceling an order is a real exchange action and requires the exact order id plus `--confirm`:

```bash
vara-agent cancel-order --provider mexc --symbol VARA/USDT --order-id "<order-id>" --confirm
```

## Live Mode

Live mode sends real orders to the exchange.

Use only after onboarding and dry-run testing:

```bash
vara-agent onboarding final-confirm --confirm
vara-agent buy --provider mexc --symbol VARA/USDT --quote-amount 10 --mode live
```

Live orders are allowed only for pairs and assets configured in onboarding risk limits.

## CEX API Key Safety

Create the key in the exchange API key section.

Gate.io setup:

- Open Security and set a Fund Password first
- Open API Key Management

MEXC setup:

- Click the account icon
- Select API Management
- Create a dedicated API key for this agent
- Enable Account Details
- Enable Trade
- Enable View Order Details
- Link IP Address is optional
- Copy the API Key / Access Key and Secret Key shown by MEXC
- Open `~/.vara-trading-agent/.env` and fill these exact lines:

```bash
MEXC_API_KEY=<paste MEXC API Key / Access Key here>
MEXC_API_SECRET=<paste MEXC Secret Key here>
```

- Secret Key may be shown only once; never paste it into chat

Required permissions:

- Read / View account data
- Trade / Spot trading

Withdrawal API key permissions:

- Enable withdrawal permission only on a dedicated withdrawal key if the user explicitly wants API withdrawals.
- Use exchange address allowlists and IP restrictions whenever available.
- Keep withdrawal keys separate from trading keys.

Create a separate API key only for this agent. Never paste API keys or secrets into chat. If the exchange supports IP whitelist and the agent platform provides a fixed IP, enable it. If there is no fixed IP, leave the whitelist disabled only if you understand the risk.

Use trading limits, a separate subaccount, and only funds you are willing to trade.

## First Release Scope

The active first release supports MEXC and Gate.io CEX trading, local onboarding, read-only market/account checks, order placement, order management, withdrawal checks, and explicitly confirmed API withdrawals. Coinbase, Crypto.com, Exolix real swap execution, Banxa checkout creation, Vara wallet validation, DEX trading, monitoring, conditional orders, arbitrage, and automatic route optimization remain future plans.
