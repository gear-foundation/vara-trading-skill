import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import {
  acceptRiskWarning,
  chooseIntegration,
  chooseTradingMode,
  completeDryRun,
  configureExolixSetup,
  configurePaperTrading,
  configureRiskLimits,
  confirmChecklist,
  finalConfirmOnboarding,
  getCexSetupInstructionLines,
  getSelectedCexIntegrations,
  formatCexIntegrationList,
  markCredentialsConfigured,
  readOnboardingState,
  resetOnboarding,
  selectExolixExecutionMode,
  validateOnboardingSetup,
  type RiskLimits,
} from "../onboarding.js";

type MenuOption<T extends string> = {
  label: string;
  value: T;
};

export async function runInteractiveOnboarding(): Promise<void> {
  const rl = createInterface({ input, output });

  try {
    const current = readOnboardingState();

    if (current.step !== "welcome" || current.status !== "not_configured") {
      console.log("Existing onboarding state found.");
      console.log(`Current step: ${current.step}`);
      console.log(`Current status: ${current.status}`);
      console.log(`Selected mode: ${current.mode ?? "not selected"}`);
      console.log(`Selected exchange(s): ${formatCexIntegrationList(getSelectedCexIntegrations(current))}`);
      console.log("");

      const choice = await choose(rl, "Continue or restart?", [
        { label: "Continue from current state", value: "continue" },
        { label: "Restart from Step 0", value: "restart" },
        { label: "Cancel", value: "cancel" },
      ]);

      if (choice === "cancel") {
        console.log("Onboarding cancelled.");
        return;
      }

      if (choice === "restart") {
        await resetOnboarding();
      }
    } else {
      await resetOnboarding();
    }

    await resumeWizard(rl);
  } catch (error) {
    if (error instanceof OnboardingCancelled) {
      console.log("Onboarding cancelled.");
      return;
    }

    throw error;
  } finally {
    rl.close();
  }
}

async function resumeWizard(rl: ReturnType<typeof createInterface>): Promise<void> {
  const state = readOnboardingState();

  switch (state.step) {
    case "welcome":
      await runWelcomeStep(rl);
      return await resumeWizard(rl);
    case "choose_mode":
      return await runChooseModeStep(rl);
    case "choose_integration":
      return state.mode === "cex_exchange" ? await runCexFlow(rl) : await runExolixFlow(rl);
    case "show_instructions":
      if (state.mode === "paper_trading") {
        return await runPaperFlow(rl);
      }

      return state.mode === "cex_exchange"
        ? await runCexAfterIntegration(rl)
        : await runExolixAfterIntegration(rl);
    case "select_execution_mode":
      return await runExolixExecutionAndParams(rl);
    case "connect_credentials":
      return await runCexCredentialsAndBeyond(rl);
    case "configure_trade_params":
      return state.mode === "instant_swap" ? await runExolixParams(rl) : await runPaperFlow(rl);
    case "configure_risk_limits":
      await configureRisk(rl);
      return await resumeWizard(rl);
    case "validate_setup":
      await validateAndDryRun(rl);
      return await finalConfirm(rl);
    case "dry_run":
      await runDryRunOnly(rl);
      return await finalConfirm(rl);
    case "final_confirmation":
      return await finalConfirm(rl);
    case "ready":
      return printReady();
  }
}

async function runWelcomeStep(rl: ReturnType<typeof createInterface>): Promise<void> {
  printWelcome();
  console.log("");

  await choose(rl, "Step 0 - continue?", [
    { label: "I understand", value: "understand" },
    { label: "Cancel", value: "cancel" },
  ]).then(async (choice) => {
    if (choice === "cancel") {
      throw new OnboardingCancelled();
    }

    await acceptRiskWarning();
  });
}

async function runChooseModeStep(rl: ReturnType<typeof createInterface>): Promise<void> {
  console.log("");
  printChooseMode();

  const mode = await choose(rl, "Choose trading mode", [
    { label: "Exchange Trading - MEXC / Gate.io", value: "cex_exchange" },
    { label: "Paper Trading - planned for later", value: "paper_trading" },
    { label: "Instant Swap Provider - planned for later", value: "instant_swap" },
    { label: "Wallet / DEX Trading - planned for later", value: "wallet_dex" },
    { label: "Cancel", value: "cancel" },
  ]);

  if (mode === "cancel") {
    throw new OnboardingCancelled();
  }

  if (mode === "wallet_dex") {
    console.log("");
    console.log("Wallet / DEX Trading is planned for later.");
    console.log("Please restart and choose Paper Trading, Exchange Trading, or Instant Swap Provider.");
    return;
  }

  await chooseTradingMode(mode);

  if (mode === "paper_trading") {
    await runPaperFlow(rl);
  } else if (mode === "cex_exchange") {
    await runCexFlow(rl);
  } else {
    await runExolixFlow(rl);
  }
}

async function runPaperFlow(rl: ReturnType<typeof createInterface>): Promise<void> {
  console.log("");
  printPaperSetup();

  const startingVirtualBalance = await askNumber(rl, "Starting virtual balance", 10000);
  const baseCurrency = await askText(rl, "Base currency", "USDT");
  const allowedAssets = csv(await askText(rl, "Allowed assets", "VARA,ETH,BTC,USDT"));
  const strategyType = await askText(rl, "Strategy type", "spot_simulation");
  const timeframe = await askText(rl, "Timeframe", "1h");

  await configurePaperTrading({
    startingVirtualBalance,
    baseCurrency: baseCurrency.toUpperCase(),
    allowedAssets,
    strategyType,
    timeframe,
  });

  await configureRisk(rl);
  await validateAndDryRun(rl);
  await finalConfirm(rl);
}

async function runCexFlow(rl: ReturnType<typeof createInterface>): Promise<void> {
  console.log("");
  printCexIntegrationChoice();

  const integration = await choose(rl, "Choose exchange", [
    { label: "MEXC", value: "mexc" },
    { label: "Gate.io", value: "gateio" },
    { label: "Both MEXC and Gate.io", value: "both" },
    { label: "Cancel", value: "cancel" },
  ]);

  if (integration === "cancel") {
    throw new OnboardingCancelled();
  }

  await chooseIntegration(integration);
  await runCexAfterIntegration(rl);
}

async function runCexAfterIntegration(rl: ReturnType<typeof createInterface>): Promise<void> {
  console.log("");
  printCexInstructions();

  const checklist = await choose(rl, "Confirm safety checklist", [
    { label: "All checklist items are true", value: "confirm" },
    { label: "Cancel", value: "cancel" },
  ]);

  if (checklist === "cancel") {
    throw new OnboardingCancelled();
  }

  await confirmChecklist();
  await runCexCredentialsAndBeyond(rl);
}

async function runCexCredentialsAndBeyond(rl: ReturnType<typeof createInterface>): Promise<void> {
  console.log("");
  printCexCredentialsStep();

  const credentials = await choose(rl, "Are credentials saved locally in ~/.vara-trading-agent/.env?", [
    { label: "Yes, credentials are saved locally", value: "confirm" },
    { label: "Not yet, stop here", value: "stop" },
  ]);

  if (credentials === "stop") {
    console.log("Stopped at the credentials step. The agent did not ask for or receive an API key in chat.");
    return;
  }

  await markCredentialsConfigured();
  await configureRisk(rl);

  try {
    await validateAndDryRun(rl);
  } catch (error) {
    console.log("");
    console.log(error instanceof Error ? error.message : String(error));
    console.log("Save valid credentials locally and run onboarding again.");
    return;
  }

  await finalConfirm(rl);
}

async function runExolixFlow(rl: ReturnType<typeof createInterface>): Promise<void> {
  await chooseIntegration("exolix");
  await runExolixAfterIntegration(rl);
}

async function runExolixAfterIntegration(rl: ReturnType<typeof createInterface>): Promise<void> {
  console.log("");
  printExolixInstructions();

  const checklist = await choose(rl, "Confirm Exolix safety checklist", [
    { label: "All checklist items are true", value: "confirm" },
    { label: "Cancel", value: "cancel" },
  ]);

  if (checklist === "cancel") {
    throw new OnboardingCancelled();
  }

  await confirmChecklist();
  await runExolixExecutionAndParams(rl);
}

async function runExolixExecutionAndParams(rl: ReturnType<typeof createInterface>): Promise<void> {
  console.log("");
  printExolixExecutionMode();

  await selectExolixExecutionMode("manual_deposit");
  await runExolixParams(rl);
}

async function runExolixParams(rl: ReturnType<typeof createInterface>): Promise<void> {
  console.log("");
  printExolixParamsStep();

  const coinFrom = await askText(rl, "coinFrom", "USDT");
  const networkFrom = await askText(rl, "networkFrom", "TRON");
  const coinTo = await askText(rl, "coinTo", "VARA");
  const networkTo = await askText(rl, "networkTo", "VARA");
  const amount = await askText(rl, "amount", "100");
  const rateType = await choose(rl, "rateType", [
    { label: "fixed", value: "fixed" },
    { label: "float", value: "float" },
  ]);
  const withdrawalAddress = await askRequiredText(rl, "withdrawalAddress");
  const refundAddress = await askRequiredText(rl, "refundAddress");
  const memoOrTag = await askText(rl, "memoOrTag, if required", "");

  await configureExolixSetup({
    mode: "manual_deposit",
    coinFrom: coinFrom.toUpperCase(),
    networkFrom: networkFrom.toUpperCase(),
    coinTo: coinTo.toUpperCase(),
    networkTo: networkTo.toUpperCase(),
    amount,
    rateType,
    withdrawalAddress,
    refundAddress,
    memoOrTag: memoOrTag || undefined,
  });

  await configureRisk(rl);
  await validateAndDryRun(rl);
  await finalConfirm(rl);
}

async function configureRisk(rl: ReturnType<typeof createInterface>): Promise<void> {
  console.log("");
  printRiskStep();

  const riskLimits: RiskLimits = {
    maxTradeSizeUsd: await askNumber(rl, "Max trade size USD", 50),
    allowedAssets: csv(
      await askText(rl, "Allowed assets, comma-separated tickers", "VARA,USDT,USDC"),
    ),
    allowedPairs: csv(
      await askText(rl, "Allowed pairs, comma-separated market symbols", "VARA/USDT,USDC/USDT"),
    ),
    maxSlippagePercent: await askNumber(rl, "Max slippage percent", 1),
  };

  await configureRiskLimits(riskLimits);
}

async function validateAndDryRun(rl: ReturnType<typeof createInterface>): Promise<void> {
  console.log("");
  printValidationStep();

  const validate = await choose(rl, "Run validation now?", [
    { label: "Run validation", value: "run" },
    { label: "Cancel", value: "cancel" },
  ]);

  if (validate === "cancel") {
    throw new OnboardingCancelled();
  }

  await validateOnboardingSetup();

  await runDryRunOnly(rl);
}

async function runDryRunOnly(rl: ReturnType<typeof createInterface>): Promise<void> {
  console.log("");
  printDryRunStep();

  const dryRun = await choose(rl, "Mark dry-run completed?", [
    { label: "Dry-run completed / continue", value: "continue" },
    { label: "Cancel", value: "cancel" },
  ]);

  if (dryRun === "cancel") {
    throw new OnboardingCancelled();
  }

  await completeDryRun();
}

async function finalConfirm(rl: ReturnType<typeof createInterface>): Promise<void> {
  console.log("");
  printFinalConfirmation();

  const confirm = await choose(rl, "Final confirmation", [
    { label: "Start Agent / mark ready", value: "confirm" },
    { label: "Cancel", value: "cancel" },
  ]);

  if (confirm === "cancel") {
    throw new OnboardingCancelled();
  }

  await finalConfirmOnboarding();

  console.log("");
  printReady();
}

function printWelcome(): void {
  console.log("Step 0 - Welcome / Risk Warning");
  console.log("");
  console.log("This agent can analyze spot markets and execute CEX trades on MEXC and Gate.io after setup.");
  console.log("");
  console.log("Crypto trading is risky. Start with dry-run or small amounts.");
}

function printChooseMode(): void {
  console.log("Future Step - Choose Mode");
  console.log("");
  console.log("Active first release onboarding uses CEX trading on MEXC and Gate.io.");
  console.log("Other modes remain planned for later and are kept in code as future integrations.");
  console.log("");
}

function printPaperSetup(): void {
  console.log("Step 3 - Paper Trading Setup");
  console.log("");
  console.log("Paper Trading uses no API key and no real funds.");
  console.log("Configure the virtual portfolio below.");
  console.log("");
}

function printCexIntegrationChoice(): void {
  console.log("Step 1 - Choose Exchange");
  console.log("");
  console.log("Choose which exchange account this agent should work with.");
  console.log("");
}

function printCexInstructions(): void {
  const state = readOnboardingState();

  console.log("Step 2 - Connect Exchange API");
  console.log("");
  getCexSetupInstructionLines(state.integration).forEach((line) => {
    console.log(line);
  });
  console.log("");
}

function printCexCredentialsStep(): void {
  const integrations = getSelectedCexIntegrations(readOnboardingState());

  console.log("Step 3 - Connect Credentials");
  console.log("");
  console.log(`Selected exchange(s): ${formatCexIntegrationList(integrations)}`);
  console.log("");
  console.log("Store credentials locally:");
  console.log("mkdir -p ~/.vara-trading-agent");
  console.log("cp .env.example ~/.vara-trading-agent/.env");
  console.log("chmod 600 ~/.vara-trading-agent/.env");
  console.log("");
  console.log("Edit ~/.vara-trading-agent/.env and set the API key and secret for the selected exchange(s).");
  console.log("The agent must never receive API keys in chat.");
  console.log("");
}

function printExolixInstructions(): void {
  console.log("Step 3 - Connect Exolix Swap Flow");
  console.log("");
  console.log("Exolix is an instant swap provider, not a traditional exchange.");
  console.log("");
  console.log("The agent creates a swap request. Exolix returns a deposit address. You manually send funds to that address, and the output asset is sent to your withdrawal address.");
  console.log("");
  console.log("Safety checklist:");
  console.log("[ ] I understand Exolix creates a deposit address for each swap");
  console.log("[ ] I will verify coin, network, address, and memo/tag");
  console.log("[ ] I provided a refund address");
  console.log("[ ] I understand blockchain transfers are irreversible");
  console.log("[ ] I am not using this to bypass KYC/AML or sanctions checks");
  console.log("");
}

function printExolixExecutionMode(): void {
  console.log("Step 4 - Select Exolix Execution Mode");
  console.log("");
  console.log("First release scope supports Manual Deposit Mode.");
  console.log("The agent creates the swap. You manually send funds to the deposit address. The agent tracks swap status later when the adapter is implemented.");
  console.log("");
}

function printExolixParamsStep(): void {
  console.log("Step 4 - Configure Exolix Manual Swap");
  console.log("");
  console.log("Enter swap parameters. Verify asset, network, address, and memo/tag carefully.");
  console.log("");
}

function printRiskStep(): void {
  console.log("Step 4 - Configure Risk Limits");
  console.log("");
  console.log("This step is required before the agent can be ready.");
  console.log("Allowed assets format: VARA,USDT,USDC");
  console.log("Allowed pairs format: VARA/USDT,USDC/USDT,BTC/USDT");
  console.log("");
}

function printValidationStep(): void {
  console.log("Step 5 - Run Test / Validation");
  console.log("");
  console.log("Validation checks that the selected setup has the required local configuration.");
  console.log("");
}

function printDryRunStep(): void {
  console.log("Step 6 - Dry-run");
  console.log("");
  console.log("Before live execution, run or confirm a dry-run. Onboarding does not place real orders or create funded swaps.");
  console.log("");
}

function printFinalConfirmation(): void {
  const state = readOnboardingState();
  const risk = state.riskLimits;

  console.log("Step 7 - Final Confirmation");
  console.log("");
  console.log(`Mode: ${state.mode ?? "not selected"}`);
  console.log(`Exchange(s): ${formatCexIntegrationList(getSelectedCexIntegrations(state))}`);
  console.log(risk ? `Max trade size: $${risk.maxTradeSizeUsd}` : "Max trade size: not configured");
  console.log(risk ? `Allowed assets: ${risk.allowedAssets.join(", ")}` : "Allowed assets: not configured");
  console.log(risk ? `Allowed pairs: ${risk.allowedPairs.join(", ")}` : "Allowed pairs: not configured");
  console.log(risk ? `Max slippage: ${risk.maxSlippagePercent}%` : "Max slippage: not configured");
  console.log("");
}

function printReady(): void {
  const state = readOnboardingState();

  console.log("Step 8 - Agent Ready");
  console.log("");
  console.log("Agent is ready.");
  console.log(`Mode: ${state.mode}`);
  console.log(`Exchange(s): ${formatCexIntegrationList(getSelectedCexIntegrations(state))}`);
  console.log("Risk limits: configured");
  console.log("");
  printNextActions(state);
}

function printNextActions(state: ReturnType<typeof readOnboardingState>): void {
  if (state.mode === "cex_exchange") {
    const integrations = getSelectedCexIntegrations(state);

    console.log("Next suggested actions:");
    integrations.forEach((provider) => {
      console.log("");
      console.log(`${formatCexIntegrationList([provider])}:`);
      console.log(`- Check market: npm run dev -- check-market --provider ${provider} --symbol VARA/USDT`);
      console.log(`- Inspect order book: npm run dev -- orderbook --provider ${provider} --symbol VARA/USDT --limit 10`);
      console.log(`- Fetch ticker: npm run dev -- ticker --provider ${provider} --symbol VARA/USDT`);
      console.log(`- Dry-run any allowed pair: npm run dev -- buy --provider ${provider} --symbol VARA/USDT --quote-amount 10 --mode dry-run`);
    });
    console.log("Live trading remains blocked unless the user explicitly requests a live trade.");
    return;
  }

  if (state.mode === "instant_swap") {
    console.log("Next suggested actions:");
    console.log("1. Review the configured swap parameters.");
    console.log("2. Fetch an Exolix quote after the Exolix adapter is added.");
    console.log("3. Do not send funds until the deposit address, asset, network, memo/tag, and refund address are verified.");
    return;
  }

  console.log("Next suggested actions:");
  console.log("1. Fetch routes for the simulated trade:");
  console.log("   npm run dev -- routes --side buy --quote USDT --amount 20");
  console.log("2. Fetch market data from a selected exchange:");
  console.log("   npm run dev -- ticker --provider mexc --symbol VARA/USDT");
  console.log("3. Run simulated decisions only. No real funds are used in Paper Trading.");
}

async function choose<T extends string>(
  rl: ReturnType<typeof createInterface>,
  prompt: string,
  options: Array<MenuOption<T>>,
): Promise<T> {
  for (;;) {
    console.log(prompt);
    options.forEach((option, index) => {
      console.log(`${index + 1}. ${option.label}`);
    });

    const answer = await rl.question("> ");
    const index = Number.parseInt(answer.trim(), 10) - 1;
    const selected = options[index];

    if (selected) {
      return selected.value;
    }

    console.log("Please enter one of the listed numbers.");
  }
}

async function askText(
  rl: ReturnType<typeof createInterface>,
  prompt: string,
  defaultValue: string,
): Promise<string> {
  const answer = await rl.question(`${prompt} [${defaultValue}]: `);
  return answer.trim() || defaultValue;
}

async function askRequiredText(
  rl: ReturnType<typeof createInterface>,
  prompt: string,
): Promise<string> {
  for (;;) {
    const answer = await rl.question(`${prompt}: `);

    if (answer.trim().length > 0) {
      return answer.trim();
    }

    console.log("This field is required.");
  }
}

async function askNumber(
  rl: ReturnType<typeof createInterface>,
  prompt: string,
  defaultValue: number,
): Promise<number> {
  for (;;) {
    const answer = await rl.question(`${prompt} [${defaultValue}]: `);
    const value = answer.trim() ? Number(answer.trim()) : defaultValue;

    if (Number.isFinite(value)) {
      return value;
    }

    console.log("Please enter a valid number.");
  }
}

function csv(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

class OnboardingCancelled extends Error {
  constructor() {
    super("Onboarding cancelled.");
  }
}
