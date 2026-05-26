import { Command } from "commander";
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
  markCredentialsConfigured,
  readOnboardingState,
  renderCurrentOnboardingStep,
  renderStateChange,
  resetOnboarding,
  selectExolixExecutionMode,
  validateOnboardingSetup,
  type ExolixExecutionMode,
  type RiskLimits,
} from "../onboarding.js";
import { printError, printOk } from "../json.js";
import { runInteractiveOnboarding } from "./onboardingInteractive.js";

export function registerOnboardingCommand(program: Command): void {
  const onboarding = program
    .command("onboarding")
    .description("Run the step-by-step local trading onboarding wizard")
    .option("--json", "Print machine-readable JSON output");

  onboarding
    .command("interactive")
    .description("Run a continuous interactive onboarding wizard")
    .action(() => {
      runInteractiveOnboarding().catch((error: unknown) => {
        printError(error);
        process.exitCode = 1;
      });
    });

  onboarding
    .command("show", { isDefault: true })
    .description("Show the current onboarding step")
    .action(() => {
      handle(onboarding, "onboarding_show", async () => readOnboardingState());
    });

  onboarding
    .command("start")
    .description("Restart onboarding from Step 0")
    .action(() => {
      handle(onboarding, "onboarding_start", resetOnboarding);
    });

  onboarding
    .command("understand")
    .description("Confirm the welcome risk warning")
    .action(() => {
      handle(onboarding, "onboarding_understand", acceptRiskWarning);
    });

  onboarding
    .command("choose-mode")
    .description("Choose trading mode")
    .requiredOption("--mode <mode>", "cex_exchange")
    .action((options) => {
      handle(onboarding, "onboarding_choose_mode", () => chooseTradingMode(options.mode));
    });

  onboarding
    .command("select")
    .description("Alias for choose-mode")
    .requiredOption("--method <method>", "cex_exchange")
    .action((options) => {
      handle(onboarding, "onboarding_choose_mode", () => chooseTradingMode(options.method));
    });

  onboarding
    .command("choose-integration")
    .description("Choose provider or exchange for the selected mode")
    .requiredOption("--integration <integration>", "mexc | gateio | both")
    .action((options) => {
      handle(onboarding, "onboarding_choose_integration", () =>
        chooseIntegration(options.integration),
      );
    });

  onboarding
    .command("checklist")
    .description("Confirm the mode-specific safety checklist")
    .requiredOption("--confirm", "Confirm every visible checklist item")
    .action(() => {
      handle(onboarding, "onboarding_checklist", confirmChecklist);
    });

  onboarding
    .command("select-execution-mode")
    .description("Select execution mode for instant swap providers")
    .requiredOption("--mode <mode>", "manual_deposit | wallet_confirmation | automated_wallet")
    .action((options) => {
      handle(onboarding, "onboarding_select_execution_mode", () =>
        selectExolixExecutionMode(options.mode),
      );
    });

  onboarding
    .command("connect")
    .description("Confirm local credential or wallet connection setup")
    .requiredOption("--credentials-local", "Confirm credentials are saved locally")
    .action(() => {
      handle(onboarding, "onboarding_connect", markCredentialsConfigured);
    });

  onboarding
    .command("configure-paper")
    .description("Configure paper trading")
    .requiredOption("--starting-balance <amount>", "virtual starting balance")
    .requiredOption("--base-currency <currency>", "base currency, e.g. USDT")
    .requiredOption("--allowed-assets <csv>", "allowed assets, e.g. VARA,ETH,BTC,USDT")
    .requiredOption("--strategy-type <type>", "strategy type, e.g. spot_simulation")
    .requiredOption("--timeframe <timeframe>", "timeframe, e.g. 1h")
    .action((options) => {
      handle(onboarding, "onboarding_configure_paper", () =>
        configurePaperTrading({
          startingVirtualBalance: numberOption(options.startingBalance, "starting-balance"),
          baseCurrency: String(options.baseCurrency).toUpperCase(),
          allowedAssets: csvOption(options.allowedAssets),
          strategyType: String(options.strategyType),
          timeframe: String(options.timeframe),
        }),
      );
    });

  onboarding
    .command("configure-swap")
    .description("Configure Exolix manual swap parameters")
    .requiredOption("--coin-from <asset>", "source asset")
    .requiredOption("--network-from <network>", "source network")
    .requiredOption("--coin-to <asset>", "target asset")
    .requiredOption("--network-to <network>", "target network")
    .requiredOption("--amount <amount>", "source amount")
    .requiredOption("--rate-type <type>", "fixed | float")
    .requiredOption("--withdrawal-address <address>", "output address")
    .requiredOption("--refund-address <address>", "refund address")
    .option("--memo-or-tag <memo>", "memo/tag if required")
    .option("--api-key-configured", "Confirm optional Exolix API key is configured locally")
    .action((options) => {
      handle(onboarding, "onboarding_configure_swap", () =>
        configureExolixSetup({
          mode: "manual_deposit" as ExolixExecutionMode,
          coinFrom: String(options.coinFrom).toUpperCase(),
          networkFrom: String(options.networkFrom).toUpperCase(),
          coinTo: String(options.coinTo).toUpperCase(),
          networkTo: String(options.networkTo).toUpperCase(),
          amount: String(options.amount),
          rateType: rateTypeOption(options.rateType),
          withdrawalAddress: String(options.withdrawalAddress),
          refundAddress: String(options.refundAddress),
          memoOrTag: options.memoOrTag ? String(options.memoOrTag) : undefined,
          apiKeyConfigured: options.apiKeyConfigured === true,
        }),
      );
    });

  onboarding
    .command("configure-risk")
    .description("Configure risk limits")
    .requiredOption("--max-trade-size-usd <amount>", "maximum trade size in USD")
    .option("--max-daily-volume-usd <amount>", "maximum daily volume in USD")
    .requiredOption("--allowed-assets <csv>", "comma-separated assets, e.g. VARA,USDT,USDC")
    .requiredOption("--allowed-pairs <csv>", "comma-separated market symbols, e.g. VARA/USDT,USDC/USDT")
    .requiredOption("--max-slippage-percent <percent>", "maximum slippage percent")
    .option("--require-confirmation-above-usd <amount>", "require manual confirmation above amount")
    .action((options) => {
      handle(onboarding, "onboarding_configure_risk", () =>
        configureRiskLimits(riskLimitsFromOptions(options)),
      );
    });

  onboarding
    .command("validate")
    .description("Validate configured setup")
    .action(() => {
      handle(onboarding, "onboarding_validate", validateOnboardingSetup);
    });

  onboarding
    .command("dry-run")
    .description("Mark the required dry-run as completed")
    .action(() => {
      handle(onboarding, "onboarding_dry_run", completeDryRun);
    });

  onboarding
    .command("final-confirm")
    .description("Final confirmation before agent is ready")
    .requiredOption("--confirm", "Confirm setup and risk limits")
    .action(() => {
      handle(onboarding, "onboarding_final_confirm", finalConfirmOnboarding);
    });

  onboarding
    .command("complete")
    .description("Alias for final-confirm --confirm")
    .action(() => {
      handle(onboarding, "onboarding_final_confirm", finalConfirmOnboarding);
    });

  onboarding
    .command("status")
    .description("Show local onboarding state")
    .action(() => {
      handle(onboarding, "onboarding_status", async () => readOnboardingState());
    });
}

function handle(
  command: Command,
  action: string,
  run: () => Promise<ReturnType<typeof readOnboardingState>> | ReturnType<typeof readOnboardingState>,
): void {
  Promise.resolve()
    .then(run)
    .then((state) => {
      if (command.opts().json === true) {
        printOk({
          action,
          state,
          screen: renderCurrentOnboardingStep(state),
        });
        return;
      }

      console.log(renderStateChange(state));
    })
    .catch((error: unknown) => {
      printError(error);
      process.exitCode = 1;
    });
}

function riskLimitsFromOptions(options: Record<string, unknown>): RiskLimits {
  return {
    maxTradeSizeUsd: numberOption(options.maxTradeSizeUsd, "max-trade-size-usd"),
    maxDailyVolumeUsd: options.maxDailyVolumeUsd
      ? numberOption(options.maxDailyVolumeUsd, "max-daily-volume-usd")
      : undefined,
    allowedAssets: csvOption(options.allowedAssets),
    allowedPairs: csvOption(options.allowedPairs),
    maxSlippagePercent: numberOption(options.maxSlippagePercent, "max-slippage-percent"),
    requireConfirmationAboveUsd: options.requireConfirmationAboveUsd
      ? numberOption(options.requireConfirmationAboveUsd, "require-confirmation-above-usd")
      : undefined,
  };
}

function csvOption(value: unknown): string[] {
  if (typeof value !== "string") {
    throw new Error("Expected comma-separated string option");
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function numberOption(value: unknown, name: string): number {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    throw new Error(`${name} must be a number`);
  }

  return number;
}

function rateTypeOption(value: unknown): "fixed" | "float" {
  if (value === "fixed" || value === "float") {
    return value;
  }

  throw new Error('rate-type must be "fixed" or "float"');
}
