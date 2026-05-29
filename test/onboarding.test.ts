import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const testHome = fs.mkdtempSync(path.join(os.tmpdir(), "vara-onboarding-test-"));
process.env.HOME = testHome;
delete process.env.MEXC_API_KEY;
delete process.env.MEXC_API_SECRET;
delete process.env.GATEIO_API_KEY;
delete process.env.GATEIO_API_SECRET;

const onboarding = await import("../src/onboarding.ts");

test("chooseIntegration both stores both active CEX integrations", async () => {
  await onboarding.resetOnboarding();
  await onboarding.acceptRiskWarning();

  const state = await onboarding.chooseIntegration("both");

  assert.equal(state.integration, "mexc,gateio");
  assert.deepEqual(state.integrations, ["mexc", "gateio"]);
  assert.deepEqual(onboarding.getSelectedCexIntegrations(state), ["mexc", "gateio"]);
});

test("both exchange instructions include exchange-specific setup and credential fields", async () => {
  const state = await onboarding.chooseIntegration("both");
  const output = onboarding.renderCurrentOnboardingStep(state);

  assert.match(output, /To connect your MEXC account/);
  assert.match(output, /MEXC_API_KEY=<paste API Key \/ Access Key here>/);
  assert.match(output, /To connect your Gate\.io account/);
  assert.match(output, /GATEIO_API_KEY=<paste Gate\.io API Key here>/);
  assert.doesNotMatch(output, /npm run dev --/);
});

test("validation fails before exchange API credentials are present", async () => {
  await onboarding.resetOnboarding();
  await onboarding.acceptRiskWarning();
  await onboarding.chooseIntegration("mexc");
  await onboarding.confirmChecklist();
  await onboarding.markCredentialsConfigured();
  await onboarding.configureRiskLimits({
    maxTradeSizeUsd: 10,
    allowedAssets: ["VARA", "USDT"],
    allowedPairs: ["VARA/USDT"],
    maxSlippagePercent: 1,
  });

  await assert.rejects(
    () => onboarding.validateOnboardingSetup(),
    /Missing local API credentials for MEXC/,
  );
});

test("validation tests CEX connection with markets and balance calls", async () => {
  await resetConfiguredCexState();
  process.env.MEXC_API_KEY = "test-key";
  process.env.MEXC_API_SECRET = "test-secret";
  const calls: string[] = [];

  const state = await onboarding.validateOnboardingSetup((integration) => ({
    marketsSummary: async () => {
      calls.push(`${integration}:markets`);
      return {
        provider: integration,
        markets_count: 123,
      };
    },
    balanceSummary: async () => {
      calls.push(`${integration}:balance`);
      return {
        non_zero_count: 2,
      };
    },
  }));

  assert.deepEqual(calls, ["mexc:markets", "mexc:balance"]);
  assert.equal(state.validation?.ok, true);
  assert.match(state.validation?.notes.join("\n") ?? "", /markets loaded through CCXT \(123 markets\)/);
  assert.match(state.validation?.notes.join("\n") ?? "", /balances are readable \(2 non-zero assets\)/);
});

test("validation wraps CEX connection failures with exchange context", async () => {
  await resetConfiguredCexState();
  process.env.MEXC_API_KEY = "test-key";
  process.env.MEXC_API_SECRET = "test-secret";

  await assert.rejects(
    () => onboarding.validateOnboardingSetup(() => ({
      marketsSummary: async () => ({
        markets_count: 1,
      }),
      balanceSummary: async () => {
        throw new Error("permission denied");
      },
    })),
    /CEX validation failed for MEXC: API credentials are present but loadMarkets\/fetchBalance failed. permission denied/,
  );
});

test("live trading guard explains oversize quote value and configured risk limit", () => {
  writeReadyState({
    riskLimits: {
      maxTradeSizeUsd: 10,
      allowedAssets: ["VARA", "USDT"],
      allowedPairs: ["VARA/USDT"],
      maxSlippagePercent: 1,
    },
  });

  assert.throws(
    () => onboarding.assertCexLiveTradingReady("mexc", "VARA/USDT", "11"),
    /estimated quote value 11 USD exceeds configured max trade size 10 USD from onboarding risk limits/,
  );
});

test("live trading guard blocks pairs outside onboarding risk limits", () => {
  writeReadyState({
    riskLimits: {
      maxTradeSizeUsd: 10,
      allowedAssets: ["VARA", "USDT"],
      allowedPairs: ["VARA/USDT"],
      maxSlippagePercent: 1,
    },
  });

  assert.throws(
    () => onboarding.assertCexLiveTradingReady("mexc", "USDC/USDT", "2"),
    /Allowed pairs: VARA\/USDT/,
  );
});

async function resetConfiguredCexState(): Promise<void> {
  await onboarding.resetOnboarding();
  await onboarding.acceptRiskWarning();
  await onboarding.chooseIntegration("mexc");
  await onboarding.confirmChecklist();
  await onboarding.markCredentialsConfigured();
  await onboarding.configureRiskLimits({
    maxTradeSizeUsd: 10,
    allowedAssets: ["VARA", "USDT"],
    allowedPairs: ["VARA/USDT"],
    maxSlippagePercent: 1,
  });
}

function writeReadyState(overrides: Partial<import("../src/onboarding.ts").OnboardingState>): void {
  const now = new Date().toISOString();
  const configDir = path.join(testHome, ".vara-trading-agent");

  fs.mkdirSync(configDir, { recursive: true });
  fs.writeFileSync(
    path.join(configDir, "onboarding.json"),
    `${JSON.stringify({
      step: "ready",
      status: "ready",
      mode: "cex_exchange",
      integration: "mexc",
      integrations: ["mexc"],
      checklistConfirmed: true,
      credentialsConfigured: true,
      validation: {
        ok: true,
        checkedAt: now,
        notes: [],
      },
      dryRun: {
        ok: true,
        checkedAt: now,
        notes: [],
      },
      createdAt: now,
      updatedAt: now,
      ...overrides,
    }, null, 2)}\n`,
  );
}
