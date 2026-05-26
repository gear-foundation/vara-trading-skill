# install_agent

Use this skill when the user asks how to install or set up the local trading agent for exchange trading.

## Local Setup

```bash
npm install -g vara-trading-skill
npx skills add gear-foundation/vara-trading-skill -g --all -y
vara-agent init-config
vara-agent onboarding interactive
```

The user must complete onboarding before live trading.

`npm install -g` installs the local CLI. `npx skills add ...` installs this agent skill pack into supported agent runtimes.

If the user installed only the npm package, `vara-agent install-skills` can copy the packaged skill files into Codex-style local skill directories.

## Safety

- Never ask the user to paste API keys into chat.
- Credentials must be saved locally in `~/.vara-trading-agent/.env`.
- Trading API keys must have read and spot trade permissions only.
- Withdrawal permission must be disabled on trading keys.
- API withdrawals require separate withdrawal keys and explicit opt-in configuration.
