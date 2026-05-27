# onboarding

Use this skill before live trading setup or when the user asks how to connect the trading agent.

Do not ask for API keys in chat. The user must configure credentials locally.

Local setup files live in the user's home directory:

- `~/.vara-trading-agent/.env`
- `~/.vara-trading-agent/onboarding.json`

If you mention file mode `600`, explain that it means only the local OS user can read and write the file. Do not describe the config as a project-local `./trading-agent` directory.

## Command

Preferred continuous setup:

```bash
vara-agent onboarding interactive
```

The agent should keep this command running and answer prompts by sending the user's selected option to the CLI. For example, if the user says "I want trade on MEXC", choose the MEXC option in the interactive wizard and continue to the next prompt instead of stopping and asking the user to say a magic phrase.

At the risk warning step, show the full warning before asking for `1` or `2`:

```text
This agent can analyze spot markets and execute CEX trades on MEXC and Gate.io after setup.

Crypto trading is risky. Start with dry-run or small amounts.
```

Use current-step output only as a fallback when interactive terminal control is unavailable:

```bash
vara-agent onboarding
```

For JSON output:

```bash
vara-agent onboarding --json
```

## Active Flow

1. Welcome / Risk Warning
2. Choose Exchange: MEXC, Gate.io, or both
3. Show exchange setup instructions
4. Confirm safety checklist
5. Confirm credentials are saved locally
6. Configure risk limits
7. Validate setup
8. Dry-run
9. Final confirmation
10. Ready

The flow should be continuous until either the user cancels or the wizard reaches an external setup task, such as creating API keys and saving them in `~/.vara-trading-agent/.env`.

When the wizard pauses for MEXC credentials, make the local fields explicit:

```bash
MEXC_API_KEY=<paste MEXC API Key / Access Key here>
MEXC_API_SECRET=<paste MEXC Secret Key here>
```

When the wizard pauses for Gate.io credentials, make the local fields explicit:

```bash
GATEIO_API_KEY=<paste Gate.io API Key here>
GATEIO_API_SECRET=<paste Gate.io Secret Key here>
```

Do not ask the user to paste key values into chat. Do not add old withdrawal-disabled wording to the MEXC or Gate.io setup checklist; withdrawal setup is a separate explicit opt-in flow.

## Safety

- Trading API keys must have read and spot trade permissions only.
- Withdrawal keys are separate and require explicit opt-in configuration.
- Credentials must be stored in `~/.vara-trading-agent/.env`.
- Live trading requires onboarding to be ready and the user to explicitly request live execution.
