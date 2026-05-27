# install_agent

Use this skill when the user asks how to install or set up the local trading agent for exchange trading.

## Local Setup

```bash
npm install -g vara-trading-skill
npx skills add https://github.com/gear-foundation/vara-trading-skill/tree/master/skill-pack -g --all -y
vara-agent init-config
vara-agent onboarding interactive
```

The user must complete onboarding before live trading.

`npm install -g` installs the local CLI. `npx skills add ...` installs this agent skill pack into supported agent runtimes.

`vara-agent init-config` creates `~/.vara-trading-agent/.env`, not a project-local `./trading-agent` directory. If the agent reports permissions, explain that mode `600` means owner-only read/write access.

After installation, the agent should run `vara-agent onboarding interactive` as a continuous wizard and keep it open while the user answers prompts. Do not switch to one-command-per-step onboarding unless interactive terminal control is unavailable.

If the user installed only the npm package, `vara-agent install-skills` can copy the packaged skill files into Codex-style local skill directories.

## Safety

- Never ask the user to paste API keys into chat.
- Credentials must be saved locally in `~/.vara-trading-agent/.env`.
- Trading API keys must have read and spot trade permissions only.
- API withdrawals require separate withdrawal keys and explicit opt-in configuration.
