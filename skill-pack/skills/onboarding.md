# onboarding

Use this skill before live trading setup or when the user asks how to connect the trading agent.

Do not ask for API keys in chat. The user must configure credentials locally.

Local setup files live in the user's home directory:

- `~/.vara-trading-agent/.env`
- `~/.vara-trading-agent/onboarding.json`

If you mention file mode `600`, explain that it means only the local OS user can read and write the file. Do not describe the config as a project-local `./trading-agent` directory.

## Command

```bash
vara-agent onboarding interactive
```

For the current step only:

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

## Safety

- Trading API keys must have read and spot trade permissions only.
- Withdrawal permission must be disabled on trading keys.
- Withdrawal keys are separate and require explicit opt-in configuration.
- Credentials must be stored in `~/.vara-trading-agent/.env`.
- Live trading requires onboarding to be ready and the user to explicitly request live execution.
