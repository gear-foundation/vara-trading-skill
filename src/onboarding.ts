import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Decimal } from "decimal.js";

import { getEnv } from "./config.js";

export type TradingMode =
  | "paper_trading"
  | "cex_exchange"
  | "instant_swap"
  | "wallet_dex";

export type OnboardingStep =
  | "welcome"
  | "choose_mode"
  | "choose_integration"
  | "show_instructions"
  | "select_execution_mode"
  | "connect_credentials"
  | "configure_trade_params"
  | "configure_risk_limits"
  | "validate_setup"
  | "dry_run"
  | "final_confirmation"
  | "ready";

export type AgentStatus =
  | "not_configured"
  | "configured"
  | "ready"
  | "running"
  | "paused"
  | "error";

export type ExolixExecutionMode =
  | "manual_deposit"
  | "wallet_confirmation"
  | "automated_wallet";

export type ActiveCexIntegration = "mexc" | "gateio";

export type RiskLimits = {
  maxTradeSizeUsd: number;
  maxDailyVolumeUsd?: number;
  allowedAssets: string[];
  allowedPairs: string[];
  maxSlippagePercent: number;
  requireConfirmationAboveUsd?: number;
};

export type PaperTradingParams = {
  startingVirtualBalance: number;
  baseCurrency: string;
  allowedAssets: string[];
  strategyType: string;
  timeframe: string;
};

export type ExolixSetup = {
  mode: ExolixExecutionMode;
  coinFrom: string;
  networkFrom: string;
  coinTo: string;
  networkTo: string;
  amount: string;
  rateType: "fixed" | "float";
  withdrawalAddress: string;
  refundAddress: string;
  memoOrTag?: string;
  apiKeyConfigured?: boolean;
};

export type OnboardingState = {
  step: OnboardingStep;
  status: AgentStatus;
  mode?: TradingMode;
  integration?: string;
  integrations?: string[];
  exolixExecutionMode?: ExolixExecutionMode;
  checklistConfirmed?: boolean;
  credentialsConfigured?: boolean;
  paperTrading?: PaperTradingParams;
  exolixSetup?: ExolixSetup;
  riskLimits?: RiskLimits;
  validation?: {
    ok: boolean;
    checkedAt: string;
    notes: string[];
  };
  dryRun?: {
    ok: boolean;
    checkedAt: string;
    notes: string[];
  };
  finalConfirmedAt?: string;
  createdAt: string;
  updatedAt: string;
};

const configDir = path.join(os.homedir(), ".vara-trading-agent");
const onboardingPath = path.join(configDir, "onboarding.json");

export function createInitialOnboardingState(): OnboardingState {
  const now = new Date().toISOString();

  return {
    step: "welcome",
    status: "not_configured",
    createdAt: now,
    updatedAt: now,
  };
}

export function readOnboardingState(): OnboardingState {
  try {
    const raw = fs.readFileSync(onboardingPath, "utf8");
    const parsed = JSON.parse(raw) as Partial<OnboardingState>;

    if (isOnboardingStep(parsed.step) && parsed.createdAt && parsed.updatedAt) {
      return {
        ...createInitialOnboardingState(),
        ...parsed,
        step: parsed.step,
        status: isAgentStatus(parsed.status) ? parsed.status : "not_configured",
        createdAt: parsed.createdAt,
        updatedAt: parsed.updatedAt,
      };
    }

    return createInitialOnboardingState();
  } catch {
    return createInitialOnboardingState();
  }
}

export async function resetOnboarding(): Promise<OnboardingState> {
  const state = createInitialOnboardingState();
  await writeOnboardingState(state);
  return state;
}

export async function acceptRiskWarning(): Promise<OnboardingState> {
  const state = readOnboardingState();

  return await updateOnboardingState({
    ...state,
    mode: "cex_exchange",
    integration: undefined,
    integrations: undefined,
    step: "choose_integration",
  });
}

export async function chooseTradingMode(mode: string): Promise<OnboardingState> {
  if (!isTradingMode(mode)) {
    throw new Error(
      'Trading mode must be "paper_trading", "cex_exchange", "instant_swap", or "wallet_dex"',
    );
  }

  if (mode === "wallet_dex") {
    throw new Error("Wallet / DEX Trading is planned for later");
  }

  const state = readOnboardingState();
  const nextStep = mode === "paper_trading" ? "show_instructions" : "choose_integration";

  return await updateOnboardingState({
    ...state,
    mode,
    integration: mode === "paper_trading" ? "paper" : undefined,
    integrations: undefined,
    step: nextStep,
    status: "not_configured",
    checklistConfirmed: false,
    credentialsConfigured: false,
    paperTrading: undefined,
    exolixSetup: undefined,
    riskLimits: undefined,
    validation: undefined,
    dryRun: undefined,
    finalConfirmedAt: undefined,
  });
}

export async function chooseIntegration(integration: string): Promise<OnboardingState> {
  const state = readOnboardingState();

  if (!state.mode) {
    throw new Error("Choose a trading mode before choosing an integration");
  }

  if (state.mode === "paper_trading") {
    throw new Error("Paper Trading does not require an integration");
  }

  if (state.mode === "cex_exchange" && !isCexIntegration(integration)) {
    throw new Error('CEX integration must be "mexc", "gateio", or "both"');
  }

  if (state.mode === "instant_swap" && integration !== "exolix") {
    throw new Error('Instant swap first release scope supports only "exolix"');
  }

  if (state.mode === "cex_exchange") {
    const integrations = parseActiveCexIntegrations(integration);

    return await updateOnboardingState({
      ...state,
      integration: integrations.join(","),
      integrations,
      step: "show_instructions",
    });
  }

  return await updateOnboardingState({
    ...state,
    integration,
    integrations: undefined,
    step: "show_instructions",
  });
}

export async function confirmChecklist(): Promise<OnboardingState> {
  const state = readOnboardingState();

  if (!state.mode) {
    throw new Error("Choose a trading mode before confirming a checklist");
  }

  const nextStep =
    state.mode === "cex_exchange"
      ? "connect_credentials"
      : state.mode === "instant_swap"
        ? "select_execution_mode"
        : "configure_trade_params";

  return await updateOnboardingState({
    ...state,
    checklistConfirmed: true,
    step: nextStep,
  });
}

export async function selectExolixExecutionMode(mode: string): Promise<OnboardingState> {
  if (!isExolixExecutionMode(mode)) {
    throw new Error(
      'Exolix execution mode must be "manual_deposit", "wallet_confirmation", or "automated_wallet"',
    );
  }

  if (mode !== "manual_deposit") {
    throw new Error("Only Exolix manual_deposit mode is implemented in the first release scope");
  }

  const state = readOnboardingState();

  if (state.mode !== "instant_swap" || state.integration !== "exolix") {
    throw new Error("Choose instant_swap mode and exolix integration first");
  }

  return await updateOnboardingState({
    ...state,
    exolixExecutionMode: mode,
    step: "configure_trade_params",
  });
}

export async function markCredentialsConfigured(): Promise<OnboardingState> {
  const state = readOnboardingState();

  if (state.mode !== "cex_exchange") {
    throw new Error("Credentials are only required for CEX exchange trading");
  }

  if (!state.integration) {
    throw new Error("Choose a CEX integration before connecting credentials");
  }

  return await updateOnboardingState({
    ...state,
    credentialsConfigured: true,
    step: "configure_risk_limits",
  });
}

export async function configurePaperTrading(params: PaperTradingParams): Promise<OnboardingState> {
  const state = readOnboardingState();

  if (state.mode !== "paper_trading") {
    throw new Error("Paper trading parameters can only be configured in paper_trading mode");
  }

  if (params.startingVirtualBalance <= 0) {
    throw new Error("Starting virtual balance must be greater than 0");
  }

  return await updateOnboardingState({
    ...state,
    paperTrading: params,
    step: "configure_risk_limits",
  });
}

export async function configureExolixSetup(setup: ExolixSetup): Promise<OnboardingState> {
  const state = readOnboardingState();

  if (state.mode !== "instant_swap" || state.integration !== "exolix") {
    throw new Error("Exolix setup requires instant_swap mode and exolix integration");
  }

  if (!state.exolixExecutionMode) {
    throw new Error("Select Exolix execution mode before configuring swap parameters");
  }

  return await updateOnboardingState({
    ...state,
    exolixSetup: setup,
    step: "configure_risk_limits",
  });
}

export async function configureRiskLimits(riskLimits: RiskLimits): Promise<OnboardingState> {
  if (riskLimits.maxTradeSizeUsd <= 0) {
    throw new Error("Max trade size must be greater than 0");
  }

  if (riskLimits.maxSlippagePercent < 0) {
    throw new Error("Max slippage percent cannot be negative");
  }

  const state = readOnboardingState();

  return await updateOnboardingState({
    ...state,
    riskLimits,
    step: "validate_setup",
    status: "configured",
  });
}

export async function validateOnboardingSetup(): Promise<OnboardingState> {
  const state = readOnboardingState();
  const notes: string[] = [];

  if (!state.mode) {
    throw new Error("Choose a trading mode before validation");
  }

  if (!state.riskLimits) {
    throw new Error("Configure risk limits before validation");
  }

  if (state.mode === "cex_exchange") {
    const integrations = getSelectedCexIntegrations(state);

    if (integrations.length === 0) {
      throw new Error("Choose at least one active CEX integration before validation");
    }

    if (!state.credentialsConfigured) {
      throw new Error("Confirm that CEX credentials are configured locally before validation");
    }

    const missingCredentials = integrations.filter((integration) => {
      const credentialStatus = cexCredentialStatus(integration);
      return !credentialStatus.apiKeyConfigured || !credentialStatus.secretConfigured;
    });

    if (missingCredentials.length > 0) {
      throw new Error(
        `Missing local API credentials for ${formatCexIntegrationList(missingCredentials)} in ~/.vara-trading-agent/.env`,
      );
    }

    notes.push(`Local API key and secret are present for ${formatCexIntegrationList(integrations)}.`);
    notes.push("Could not verify trading-key permissions through API. Please confirm manually that only the intended read and spot trading permissions are enabled.");
    notes.push("Fetch balances and market dry-run should be performed before any live order.");
  }

  if (state.mode === "instant_swap") {
    if (!state.exolixSetup) {
      throw new Error("Configure Exolix swap parameters before validation");
    }

    notes.push("Exolix parameters are present.");
    notes.push("Provider quote and address validation are planned for a later adapter.");
    notes.push("Manual Deposit Mode requires the user to verify coin, network, address, and memo/tag before sending funds.");
  }

  if (state.mode === "paper_trading") {
    if (!state.paperTrading) {
      throw new Error("Configure paper trading parameters before validation");
    }

    notes.push("Virtual portfolio parameters are configured.");
    notes.push("No API key or real funds are required.");
  }

  return await updateOnboardingState({
    ...state,
    validation: {
      ok: true,
      checkedAt: new Date().toISOString(),
      notes,
    },
    step: "dry_run",
  });
}

export async function completeDryRun(): Promise<OnboardingState> {
  const state = readOnboardingState();

  if (!state.validation?.ok) {
    throw new Error("Validate setup before dry-run");
  }

  const notes =
    state.mode === "cex_exchange"
      ? [
          "Dry-run required: fetch balances, fetch market price, simulate order, and check min order size.",
          "No real order was placed by onboarding.",
        ]
      : state.mode === "instant_swap"
        ? [
            "Dry-run required: fetch supported currencies, fetch quote, validate addresses, and show estimated output.",
            "No funded swap was created by onboarding.",
          ]
        : [
            "Virtual portfolio can be created and first simulated decision can run.",
            "No real funds are used.",
          ];

  return await updateOnboardingState({
    ...state,
    dryRun: {
      ok: true,
      checkedAt: new Date().toISOString(),
      notes,
    },
    step: "final_confirmation",
  });
}

export async function finalConfirmOnboarding(): Promise<OnboardingState> {
  const state = readOnboardingState();

  if (!state.dryRun?.ok) {
    throw new Error("Complete dry-run before final confirmation");
  }

  return await updateOnboardingState({
    ...state,
    finalConfirmedAt: new Date().toISOString(),
    status: "ready",
    step: "ready",
  });
}

export function assertCexLiveTradingReady(
  provider?: string,
  symbol?: string,
  estimatedTradeSizeUsd?: string,
): void {
  const state = readOnboardingState();

  if (state.mode !== "cex_exchange" || state.status !== "ready") {
    throw new Error(
      "Live CEX trading is blocked until onboarding is ready. Run: npm run dev -- onboarding",
    );
  }

  if (!provider) {
    return;
  }

  const integrations = getSelectedCexIntegrations(state);

  if (!integrations.includes(provider as ActiveCexIntegration)) {
    throw new Error(
      `Live CEX trading is blocked for ${provider}. Active onboarding exchanges: ${formatCexIntegrationList(integrations)}`,
    );
  }

  if (symbol) {
    assertSymbolAllowedForLiveTrading(state, symbol);
  }

  if (estimatedTradeSizeUsd) {
    assertTradeSizeAllowedForLiveTrading(state, estimatedTradeSizeUsd);
  }
}

export function cexCredentialStatus(integration: string): {
  apiKeyConfigured: boolean;
  secretConfigured: boolean;
  passphraseConfigured: boolean;
} {
  const prefix = cexEnvPrefix(integration);

  return {
    apiKeyConfigured: Boolean(getEnv(`${prefix}_API_KEY`)),
    secretConfigured: Boolean(getEnv(`${prefix}_API_SECRET`)),
    passphraseConfigured: Boolean(getEnv(`${prefix}_API_PASSPHRASE`)),
  };
}

export function getSelectedCexIntegrations(state: OnboardingState): ActiveCexIntegration[] {
  if (state.integrations && state.integrations.length > 0) {
    return uniqueActiveCexIntegrations(state.integrations);
  }

  if (state.integration) {
    try {
      return parseActiveCexIntegrations(state.integration);
    } catch {
      return [];
    }
  }

  return [];
}

export function formatCexIntegrationList(integrations: readonly string[]): string {
  if (integrations.length === 0) {
    return "none";
  }

  return integrations.map(formatCexIntegration).join(", ");
}

export function renderCurrentOnboardingStep(state: OnboardingState): string {
  switch (state.step) {
    case "welcome":
      return renderWelcome(state);
    case "choose_mode":
      return renderChooseMode(state);
    case "choose_integration":
      return renderChooseIntegration(state);
    case "show_instructions":
      return renderModeInstructions(state);
    case "select_execution_mode":
      return renderSelectExecutionMode(state);
    case "connect_credentials":
      return renderConnectCredentials(state);
    case "configure_trade_params":
      return renderConfigureTradeParams(state);
    case "configure_risk_limits":
      return renderConfigureRiskLimits(state);
    case "validate_setup":
      return renderValidateSetup(state);
    case "dry_run":
      return renderDryRun(state);
    case "final_confirmation":
      return renderFinalConfirmation(state);
    case "ready":
      return renderReady(state);
  }
}

export function renderStateChange(state: OnboardingState): string {
  return renderCurrentOnboardingStep(state);
}

async function updateOnboardingState(state: OnboardingState): Promise<OnboardingState> {
  const updated: OnboardingState = {
    ...state,
    updatedAt: new Date().toISOString(),
  };

  await writeOnboardingState(updated);
  return updated;
}

async function writeOnboardingState(state: OnboardingState): Promise<void> {
  await fsp.mkdir(configDir, { recursive: true });
  await fsp.writeFile(onboardingPath, `${JSON.stringify(state, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
}

function renderWelcome(state: OnboardingState): string {
  return [
    "Step 0 - Welcome / Risk Warning",
    "",
    "This agent can analyze spot markets and execute CEX trades on MEXC and Gate.io after setup.",
    "",
    "Crypto trading is risky. Start with dry-run or small amounts.",
    "",
    renderStateLine(state),
    "",
    "Continue:",
    "vara-agent onboarding understand",
  ].join("\n");
}

function renderChooseMode(state: OnboardingState): string {
  return [
    "Future Step - Choose Mode",
    "",
    "Active first release onboarding uses CEX trading on MEXC and Gate.io.",
    "Other modes remain planned for later and are kept in code as future integrations.",
    "",
    "Current active mode:",
    "npm run dev -- onboarding choose-mode --mode cex_exchange",
  ].join("\n");
}

function renderChooseIntegration(state: OnboardingState): string {
  if (state.mode === "cex_exchange") {
    return [
      "Step 1 - Choose Exchange",
      "",
      "Choose which exchange account this agent should work with:",
      "",
      "1. MEXC",
      "2. Gate.io",
      "3. Both MEXC and Gate.io",
      "",
      "Choose:",
      "npm run dev -- onboarding choose-integration --integration mexc",
      "npm run dev -- onboarding choose-integration --integration gateio",
      "npm run dev -- onboarding choose-integration --integration both",
    ].join("\n");
  }

  if (state.mode === "instant_swap") {
    return [
      "Step 2 - Choose Integration",
      "",
      "Choose an instant swap provider:",
      "",
      "1. Exolix",
      "2. Other swap provider - planned",
      "",
      "Choose:",
      "npm run dev -- onboarding choose-integration --integration exolix",
    ].join("\n");
  }

  return renderCurrentOnboardingStep({
    ...state,
    step: "configure_trade_params",
  });
}

function renderModeInstructions(state: OnboardingState): string {
  if (state.mode === "cex_exchange") {
    return [
      "Step 2 - Connect Exchange API",
      "",
      ...getSelectedCexIntegrations(state).flatMap((integration, index) => [
        ...(index > 0 ? [""] : []),
        ...getCexSetupInstructionLines(integration),
      ]),
      "",
      "After you confirm every checkbox:",
      "npm run dev -- onboarding checklist --confirm",
    ].join("\n");
  }

  if (state.mode === "instant_swap") {
    return [
      "Step 2 - Connect Exolix Swap Flow",
      "",
      "Exolix is an instant swap provider, not a traditional exchange.",
      "",
      "The agent does not trade from an exchange balance. Instead, it creates a swap request. Exolix returns a deposit address. Funds must be sent to that address, and the output asset is sent to your withdrawal address.",
      "",
      "Safety checklist:",
      "[ ] I understand Exolix creates a deposit address for each swap",
      "[ ] I will verify coin, network, address, and memo/tag",
      "[ ] I provided a refund address",
      "[ ] I understand blockchain transfers are irreversible",
      "[ ] I am not using this to bypass KYC/AML or sanctions checks",
      "",
      "After you confirm every checkbox:",
      "npm run dev -- onboarding checklist --confirm",
    ].join("\n");
  }

  return [
    "Step 2 - Paper Trading Setup",
    "",
    "Paper Trading uses no API key and no real funds.",
    "",
    "Configure virtual portfolio parameters:",
    "npm run dev -- onboarding configure-paper --starting-balance 10000 --base-currency USDT --allowed-assets VARA,ETH,BTC,USDT --strategy-type spot_simulation --timeframe 1h",
  ].join("\n");
}

export function getCexSetupInstructionLines(integration?: string): string[] {
  if (integration === "gateio") {
    return [
      "To connect your Gate.io account:",
      "",
      "1. Log in to your Gate.io account.",
      "2. Open Security and set a Fund Password first.",
      "   It protects fund security. Trading does not require fund password input by default.",
      "3. Open API Key Management.",
      "4. Create a new API key specifically for this agent.",
      "5. Enable only Read / View account data and Spot Trading.",
      "6. Use IP whitelist if available.",
      "7. Copy API Key and Secret Key into local settings, not into chat.",
      "",
      "Safety checklist:",
      "[ ] I set a Fund Password in Security",
      "[ ] I created a separate Gate.io API key for this agent",
      "[ ] Only Read and Trade permissions are enabled",
      "[ ] I understand that trading is risky",
    ];
  }

  if (integration === "mexc") {
    return [
      "To connect your MEXC account:",
      "",
      "1. Log in to your MEXC account.",
      "2. Click the account icon.",
      "3. Select API Management.",
      "4. Create a new API key specifically for this agent.",
      "5. In the API key permission settings, enable only:",
      "   - Account Details",
      "   - Trade",
      "   - View Order Details",
      "6. Link IP Address is optional. Enable it only if you have a stable IP address.",
      "7. After the key is created, copy the API Key / Access Key and Secret Key shown by MEXC.",
      "8. Open ~/.vara-trading-agent/.env and fill these exact lines:",
      "   MEXC_API_KEY=<paste API Key / Access Key here>",
      "   MEXC_API_SECRET=<paste Secret Key here>",
      "   Secret Key may be shown only once. Do not paste either value into chat.",
      "",
      "Safety checklist:",
      "[ ] I created a separate MEXC API key for this agent",
      "[ ] Account Details, Trade, and View Order Details are enabled",
      "[ ] Link IP Address is configured or intentionally skipped",
      "[ ] I understand that trading is risky",
    ];
  }

  return [
    "To connect your exchange account:",
    "",
    "1. Log in to your exchange account.",
    "2. Open the exchange API key section.",
    "3. Create a new API key specifically for this agent.",
    "4. Enable only Read / View account data and Spot Trading.",
    "5. Use IP whitelist if available.",
    "6. Copy API Key and Secret Key into local settings, not into chat.",
    "",
    "Safety checklist:",
    "[ ] I created a separate API key for this agent",
    "[ ] Only Read and Trade permissions are enabled",
    "[ ] I understand that trading is risky",
  ];
}

function renderSelectExecutionMode(_state: OnboardingState): string {
  return [
    "Step 4 - Select Exolix Execution Mode",
    "",
    "1. Manual Deposit Mode",
    "   Agent creates the swap. You manually send funds to the deposit address. Agent tracks the swap status.",
    "",
    "2. Wallet Confirmation Mode",
    "   Planned. Agent prepares a wallet transaction and you manually sign it.",
    "",
    "3. Automated Wallet Mode",
    "   Advanced planned mode. Use only with a separate limited-balance trading wallet.",
    "",
    "First release scope supports Manual Deposit Mode:",
    "npm run dev -- onboarding select-execution-mode --mode manual_deposit",
  ].join("\n");
}

function renderConnectCredentials(state: OnboardingState): string {
  const integrations = getSelectedCexIntegrations(state);

  return [
    "Step 3 - Connect Credentials",
    "",
    `Selected exchange(s): ${formatCexIntegrationList(integrations)}`,
    "",
    "Store credentials locally:",
    "mkdir -p ~/.vara-trading-agent",
    "cp .env.example ~/.vara-trading-agent/.env",
    "chmod 600 ~/.vara-trading-agent/.env",
    "",
    "Edit ~/.vara-trading-agent/.env and fill the API key and secret for the selected exchange(s):",
    ...credentialEnvSnippetLines(integrations),
    "",
    "The agent must never receive API keys in chat.",
    "",
    "After credentials are saved locally:",
    "npm run dev -- onboarding connect --credentials-local",
  ].join("\n");
}

function renderConfigureTradeParams(state: OnboardingState): string {
  if (state.mode === "instant_swap") {
    return [
      "Step 4 - Configure Exolix Manual Swap",
      "",
      "Required fields:",
      "- coinFrom",
      "- networkFrom",
      "- coinTo",
      "- networkTo",
      "- amount",
      "- rateType: fixed or float",
      "- withdrawalAddress",
      "- refundAddress",
      "- memoOrTag, if required",
      "",
      "Example:",
      "npm run dev -- onboarding configure-swap --coin-from USDT --network-from TRON --coin-to VARA --network-to VARA --amount 100 --rate-type fixed --withdrawal-address <address> --refund-address <address>",
    ].join("\n");
  }

  return [
    "Step 4 - Configure Paper Trading",
    "",
    "Example:",
    "npm run dev -- onboarding configure-paper --starting-balance 10000 --base-currency USDT --allowed-assets VARA,ETH,BTC,USDT --strategy-type spot_simulation --timeframe 1h",
  ].join("\n");
}

function renderConfigureRiskLimits(_state: OnboardingState): string {
  return [
    "Step 4 - Configure Risk Limits",
    "",
    "This step is required before the agent can be ready.",
    "",
    "Minimum risk settings:",
    "- Max trade size",
    "- Allowed assets: comma-separated asset tickers, e.g. VARA,USDT,USDC",
    "- Allowed pairs: comma-separated market symbols, e.g. VARA/USDT,USDC/USDT,BTC/USDT",
    "- Max slippage",
    "",
    "Example:",
    "npm run dev -- onboarding configure-risk --max-trade-size-usd 50 --allowed-assets VARA,USDT,USDC --allowed-pairs VARA/USDT,USDC/USDT --max-slippage-percent 1",
  ].join("\n");
}

function renderValidateSetup(state: OnboardingState): string {
  return [
    "Step 5 - Run Test / Validation",
    "",
    state.mode === "cex_exchange"
      ? "CEX validation checks local API credential presence and reminds you to confirm the intended read and spot trading permissions."
      : state.mode === "instant_swap"
        ? "Exolix validation checks configured swap parameters. Provider quote validation will arrive with the Exolix adapter."
        : "Paper validation checks virtual portfolio configuration.",
    "",
    "Run:",
    "npm run dev -- onboarding validate",
  ].join("\n");
}

function renderDryRun(state: OnboardingState): string {
  return [
    "Step 6 - Dry-run",
    "",
    state.mode === "cex_exchange"
      ? "Before live CEX trading, run market checks and dry-run order simulation. Onboarding will not place real orders."
      : state.mode === "instant_swap"
        ? "Before creating a funded swap, fetch a quote and validate all addresses. Onboarding will not create a funded swap."
        : "Create the virtual portfolio and run the first simulated decision.",
    "",
    "Mark dry-run completed:",
    "npm run dev -- onboarding dry-run",
  ].join("\n");
}

function renderFinalConfirmation(state: OnboardingState): string {
  return [
    "Step 7 - Final Confirmation",
    "",
    renderSummary(state),
    "",
    "Confirm only if everything is correct:",
    "npm run dev -- onboarding final-confirm --confirm",
    "",
    "Or go back by changing mode/integration/configuration commands.",
  ].join("\n");
}

function renderReady(state: OnboardingState): string {
  return [
    "Step 8 - Agent Ready",
    "",
    "Agent is ready.",
    `Mode: ${state.mode}`,
    `Exchange(s): ${formatCexIntegrationList(getSelectedCexIntegrations(state))}`,
    "Risk limits: configured",
    "",
    nextReadyActions(state),
  ].join("\n");
}

function renderSummary(state: OnboardingState): string {
  const risk = state.riskLimits;

  return [
    `Mode: ${state.mode ?? "not selected"}`,
    `Exchange(s): ${formatCexIntegrationList(getSelectedCexIntegrations(state))}`,
    risk ? `Max trade size: $${risk.maxTradeSizeUsd}` : "Max trade size: not configured",
    risk ? `Allowed assets: ${risk.allowedAssets.join(", ")}` : "Allowed assets: not configured",
    risk ? `Allowed pairs: ${risk.allowedPairs.join(", ")}` : "Allowed pairs: not configured",
    risk ? `Max slippage: ${risk.maxSlippagePercent}%` : "Max slippage: not configured",
  ].join("\n");
}

function renderStateLine(state: OnboardingState): string {
  return `Current status: ${state.status}, step: ${state.step}`;
}

function assertSymbolAllowedForLiveTrading(state: OnboardingState, symbol: string): void {
  const risk = state.riskLimits;

  if (!risk) {
    throw new Error("Live CEX trading is blocked until risk limits are configured");
  }

  const normalizedSymbol = normalizeSymbol(symbol);
  const allowedPairs = risk.allowedPairs.map(normalizeSymbol);

  if (!allowedPairs.includes(normalizedSymbol)) {
    throw new Error(
      `Live CEX trading is blocked for ${normalizedSymbol}. Allowed pairs: ${risk.allowedPairs.join(", ")}`,
    );
  }

  const [base, quote] = normalizedSymbol.split("/");
  const allowedAssets = risk.allowedAssets.map((asset) => asset.toUpperCase());

  if (!allowedAssets.includes(base) || !allowedAssets.includes(quote)) {
    throw new Error(
      `Live CEX trading is blocked for ${normalizedSymbol}. Allowed assets: ${risk.allowedAssets.join(", ")}`,
    );
  }
}

function assertTradeSizeAllowedForLiveTrading(
  state: OnboardingState,
  estimatedTradeSizeUsd: string,
): void {
  const risk = state.riskLimits;

  if (!risk) {
    throw new Error("Live CEX trading is blocked until risk limits are configured");
  }

  const max = new Decimal(risk.maxTradeSizeUsd);
  const amount = new Decimal(estimatedTradeSizeUsd);

  if (max.gt(0) && amount.gt(max)) {
    throw new Error(
      `Live CEX trading is blocked: estimated trade size ${amount.toString()} exceeds max trade size ${max.toString()}`,
    );
  }
}

function normalizeSymbol(symbol: string): string {
  return symbol.trim().toUpperCase();
}

function nextReadyActions(state: OnboardingState): string {
  if (state.mode === "instant_swap") {
    return [
      "Next suggested actions:",
      "1. Review the configured swap parameters.",
      "2. Fetch an Exolix quote after the Exolix adapter is added.",
      "3. Do not send funds until the deposit address, asset, network, memo/tag, and refund address are verified.",
    ].join("\n");
  }

  if (state.mode === "cex_exchange") {
    const integrations = getSelectedCexIntegrations(state);

    return [
      "Next suggested actions:",
      ...integrations.flatMap((provider) => [
        "",
        `${formatCexIntegration(provider)}:`,
        `- Check market: npm run dev -- check-market --provider ${provider} --symbol VARA/USDT`,
        `- Inspect order book: npm run dev -- orderbook --provider ${provider} --symbol VARA/USDT --limit 10`,
        `- Fetch ticker: npm run dev -- ticker --provider ${provider} --symbol VARA/USDT`,
        `- Dry-run any allowed pair: npm run dev -- buy --provider ${provider} --symbol VARA/USDT --quote-amount 10 --mode dry-run`,
      ]),
      "Live trading remains blocked unless the user explicitly requests a live trade.",
    ].join("\n");
  }

  return [
    "Next suggested actions:",
    "1. Fetch routes for the simulated trade:",
    "   npm run dev -- routes --side buy --quote USDT --amount 20",
    "2. Fetch market data from a selected exchange:",
    "   npm run dev -- ticker --provider mexc --symbol VARA/USDT",
    "3. Run simulated decisions only. No real funds are used in Paper Trading.",
  ].join("\n");
}

function cexEnvPrefix(integration: string): string {
  switch (integration) {
    case "mexc":
      return "MEXC";
    case "gateio":
      return "GATEIO";
    case "coinbase":
      return "COINBASE";
    case "cryptocom":
      return "CRYPTOCOM";
    default:
      return integration.toUpperCase();
  }
}

function isTradingMode(value: string): value is TradingMode {
  return (
    value === "paper_trading" ||
    value === "cex_exchange" ||
    value === "instant_swap" ||
    value === "wallet_dex"
  );
}

function isExolixExecutionMode(value: string): value is ExolixExecutionMode {
  return (
    value === "manual_deposit" ||
    value === "wallet_confirmation" ||
    value === "automated_wallet"
  );
}

function isCexIntegration(value: string): boolean {
  try {
    return parseActiveCexIntegrations(value).length > 0;
  } catch {
    return false;
  }
}

function parseActiveCexIntegrations(value: string): ActiveCexIntegration[] {
  const normalized = value.trim().toLowerCase();

  if (normalized === "both") {
    return ["mexc", "gateio"];
  }

  const integrations = normalized
    .split(",")
    .map((item) => normalizeActiveCexIntegration(item.trim()))
    .filter((item): item is ActiveCexIntegration => Boolean(item));

  if (integrations.length === 0) {
    throw new Error('CEX integration must be "mexc", "gateio", or "both"');
  }

  return uniqueActiveCexIntegrations(integrations);
}

function normalizeActiveCexIntegration(value: string): ActiveCexIntegration | undefined {
  if (value === "mexc") {
    return "mexc";
  }

  if (value === "gateio" || value === "gate" || value === "gate.io") {
    return "gateio";
  }

  return undefined;
}

function uniqueActiveCexIntegrations(values: readonly string[]): ActiveCexIntegration[] {
  const result: ActiveCexIntegration[] = [];

  values.forEach((value) => {
    const normalized = normalizeActiveCexIntegration(value);

    if (normalized && !result.includes(normalized)) {
      result.push(normalized);
    }
  });

  return result;
}

function formatCexIntegration(integration: string): string {
  switch (integration) {
    case "mexc":
      return "MEXC";
    case "gateio":
      return "Gate.io";
    default:
      return integration;
  }
}

export function credentialEnvSnippetLines(integrations: readonly ActiveCexIntegration[]): string[] {
  if (integrations.length === 0) {
    return ["- No active CEX exchange selected"];
  }

  return integrations.flatMap((integration) => {
    const prefix = cexEnvPrefix(integration);
    const label = formatCexIntegration(integration);
    const apiKeyLabel = integration === "mexc" ? `${label} API Key / Access Key` : `${label} API Key`;

    return [
      `${prefix}_API_KEY=<paste ${apiKeyLabel} here>`,
      `${prefix}_API_SECRET=<paste ${label} Secret Key here>`,
    ];
  });
}

function isOnboardingStep(value: unknown): value is OnboardingStep {
  return (
    value === "welcome" ||
    value === "choose_mode" ||
    value === "choose_integration" ||
    value === "show_instructions" ||
    value === "select_execution_mode" ||
    value === "connect_credentials" ||
    value === "configure_trade_params" ||
    value === "configure_risk_limits" ||
    value === "validate_setup" ||
    value === "dry_run" ||
    value === "final_confirmation" ||
    value === "ready"
  );
}

function isAgentStatus(value: unknown): value is AgentStatus {
  return (
    value === "not_configured" ||
    value === "configured" ||
    value === "ready" ||
    value === "running" ||
    value === "paused" ||
    value === "error"
  );
}
