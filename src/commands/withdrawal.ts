import { Decimal } from "decimal.js";

import {
  getAllowedWithdrawAddresses,
  getAllowedWithdrawAssets,
  getAllowedWithdrawNetworks,
  getMaxWithdrawAmount,
  isDryRun,
  isWithdrawalEnabled,
} from "../config.js";
import { CcxtAdapter } from "../exchanges/ccxtAdapter.js";
import { createExchange, createWithdrawalExchange } from "../exchanges/exchangeFactory.js";
import { printOk } from "../json.js";
import type { CexProvider, ExecutionMode } from "../types.js";

type WithdrawalGuideInput = {
  provider: CexProvider;
  asset?: string;
  network?: string;
  amount?: string;
  addressConfirmed: boolean;
};

type WithdrawalInput = {
  provider: CexProvider;
  asset: string;
  network?: string;
  amount: string;
  address: string;
  tag?: string;
  mode?: ExecutionMode;
  addressConfirmed: boolean;
  confirmed: boolean;
};

type BasicWithdrawalInput = {
  provider: CexProvider;
  asset: string;
  network?: string;
  amount: string;
  address: string;
  tag?: string;
  addressConfirmed: boolean;
};

export function withdrawalGuide(input: WithdrawalGuideInput): void {
  assertActiveProvider(input.provider);

  const asset = input.asset?.toUpperCase();
  const network = input.network?.toUpperCase();

  printOk({
    action: "withdrawal_guide",
    provider: input.provider,
    asset: asset ?? null,
    network: network ?? null,
    amount: input.amount ?? null,
    api_withdrawal_available: true,
    api_withdrawal_enabled: isWithdrawalEnabled(),
    address_confirmed_by_user: input.addressConfirmed,
    required_for_api_withdrawal: [
      "VARA_AGENT_ENABLE_WITHDRAWALS=true",
      "Dedicated withdrawal API key configured locally",
      "Asset is in VARA_AGENT_ALLOWED_WITHDRAW_ASSETS",
      "Network is in VARA_AGENT_ALLOWED_WITHDRAW_NETWORKS",
      "Address is in VARA_AGENT_ALLOWED_WITHDRAW_ADDRESSES",
      "Per-asset limit VARA_AGENT_MAX_WITHDRAW_<ASSET> is greater than zero",
      "Command uses --mode live --confirm-withdrawal --address-confirmed",
    ],
    safety_rules: [
      "Withdrawal is irreversible once accepted by the exchange.",
      "Use a separate withdrawal API key if the exchange supports it.",
      "Enable exchange address allowlist whenever available.",
      "Verify asset, network, destination address, memo/tag, fee, and minimum withdrawal amount.",
      "Use a small test withdrawal first when sending to a new address.",
    ],
    manual_steps: providerSteps(input.provider),
    commands: {
      check: "vara-agent withdrawal-check --provider <provider> --asset <asset> --network <network> --amount <amount> --address <address>",
      dry_run: "vara-agent withdraw --provider <provider> --asset <asset> --network <network> --amount <amount> --address <address> --mode dry-run",
      live: "vara-agent withdraw --provider <provider> --asset <asset> --network <network> --amount <amount> --address <address> --mode live --address-confirmed --confirm-withdrawal",
    },
  });
}

export async function withdrawalCheck(input: BasicWithdrawalInput): Promise<void> {
  assertActiveProvider(input.provider);
  const normalized = normalizeWithdrawalInput(input);
  assertBasicWithdrawalInput(normalized);

  const exchange = createExchange(normalized.provider);
  const adapter = new CcxtAdapter(exchange, normalized.provider);
  const info = await adapter.withdrawalInfo(
    normalized.asset,
    normalized.network,
    normalized.amount,
    normalized.address,
  );

  printOk({
    action: "withdrawal_check",
    provider: normalized.provider,
    asset: normalized.asset,
    network: normalized.network ?? null,
    amount: normalized.amount,
    address: maskAddress(normalized.address),
    config: withdrawalConfigSnapshot(normalized.asset),
    info,
  });
}

export async function withdrawAsset(input: WithdrawalInput): Promise<void> {
  assertActiveProvider(input.provider);
  const normalized = normalizeWithdrawalInput(input);
  assertBasicWithdrawalInput(normalized);

  const dryRun = resolveDryRun(normalized.mode);

  if (dryRun) {
    const exchange = createExchange(normalized.provider);
    const adapter = new CcxtAdapter(exchange, normalized.provider);
    const info = await adapter.withdrawalInfo(
      normalized.asset,
      normalized.network,
      normalized.amount,
      normalized.address,
    );

    printOk({
      action: "withdraw",
      mode: "dry-run",
      dry_run: true,
      provider: normalized.provider,
      asset: normalized.asset,
      network: normalized.network ?? null,
      amount: normalized.amount,
      address: maskAddress(normalized.address),
      tag_provided: Boolean(normalized.tag),
      config: withdrawalConfigSnapshot(normalized.asset),
      info,
      message: "Dry run only. No withdrawal was submitted.",
    });
    return;
  }

  assertLiveWithdrawalAllowed(normalized);

  const exchange = createWithdrawalExchange(normalized.provider);
  const adapter = new CcxtAdapter(exchange, normalized.provider);
  const result = await adapter.withdraw(
    normalized.asset,
    normalized.amount,
    normalized.address,
    normalized.tag,
    normalized.network,
  );

  printOk({
    action: "withdraw",
    mode: "live",
    provider: normalized.provider,
    asset: normalized.asset,
    network: normalized.network ?? null,
    amount: normalized.amount,
    address: maskAddress(normalized.address),
    tag_provided: Boolean(normalized.tag),
    result,
  });
}

function assertActiveProvider(provider: CexProvider): void {
  if (provider !== "mexc" && provider !== "gateio") {
    throw new Error("Withdrawal commands support only active first release exchanges: mexc and gateio");
  }
}

function assertBasicWithdrawalInput(input: BasicWithdrawalInput): void {
  if (new Decimal(input.amount).lte(0)) {
    throw new Error("Withdrawal amount must be greater than zero");
  }

  if (input.address.trim().length < 8) {
    throw new Error("Withdrawal address looks too short");
  }
}

function assertLiveWithdrawalAllowed(input: WithdrawalInput): void {
  if (!isWithdrawalEnabled()) {
    throw new Error("Live withdrawals are disabled. Set VARA_AGENT_ENABLE_WITHDRAWALS=true locally to opt in.");
  }

  if (!input.addressConfirmed) {
    throw new Error("Live withdrawal requires --address-confirmed");
  }

  if (!input.confirmed) {
    throw new Error("Live withdrawal requires --confirm-withdrawal");
  }

  const allowedAssets = getAllowedWithdrawAssets();
  const allowedNetworks = getAllowedWithdrawNetworks();
  const allowedAddresses = getAllowedWithdrawAddresses();

  if (allowedAssets.length === 0 || !allowedAssets.includes(input.asset)) {
    throw new Error(`Asset ${input.asset} is not in VARA_AGENT_ALLOWED_WITHDRAW_ASSETS`);
  }

  if (!input.network || allowedNetworks.length === 0 || !allowedNetworks.includes(input.network)) {
    throw new Error(`Network ${input.network ?? "not provided"} is not in VARA_AGENT_ALLOWED_WITHDRAW_NETWORKS`);
  }

  if (allowedAddresses.length === 0 || !allowedAddresses.includes(input.address)) {
    throw new Error("Withdrawal address is not in VARA_AGENT_ALLOWED_WITHDRAW_ADDRESSES");
  }

  const max = new Decimal(getMaxWithdrawAmount(input.asset));

  if (max.lte(0)) {
    throw new Error(`Set VARA_AGENT_MAX_WITHDRAW_${input.asset} to a positive amount before live withdrawal`);
  }

  if (new Decimal(input.amount).gt(max)) {
    throw new Error(`Withdrawal amount ${input.amount} exceeds VARA_AGENT_MAX_WITHDRAW_${input.asset}=${max.toString()}`);
  }
}

function normalizeWithdrawalInput<T extends { provider: CexProvider; asset: string; network?: string; address: string; amount: string; tag?: string }>(
  input: T,
): T {
  return {
    ...input,
    asset: input.asset.toUpperCase(),
    network: input.network?.toUpperCase(),
    address: input.address.trim(),
    amount: input.amount.trim(),
    tag: input.tag?.trim(),
  };
}

function resolveDryRun(mode?: ExecutionMode): boolean {
  if (!mode) {
    return isDryRun();
  }

  if (mode !== "dry-run" && mode !== "live") {
    throw new Error('Execution mode must be "dry-run" or "live"');
  }

  return mode === "dry-run";
}

function withdrawalConfigSnapshot(asset: string): Record<string, unknown> {
  return {
    enabled: isWithdrawalEnabled(),
    allowed_assets: getAllowedWithdrawAssets(),
    allowed_networks: getAllowedWithdrawNetworks(),
    allowed_addresses_count: getAllowedWithdrawAddresses().length,
    max_amount_for_asset: getMaxWithdrawAmount(asset),
  };
}

function providerSteps(provider: CexProvider): string[] {
  if (provider === "mexc") {
    return [
      "Open MEXC in the official website or app.",
      "Review withdrawal settings, address allowlist, and security confirmations.",
      "Create a dedicated withdrawal API key only if you intentionally want API withdrawals.",
      "Restrict the key with address allowlist and IP restrictions whenever available.",
      "Keep trading API keys separate from withdrawal API keys.",
    ];
  }

  return [
    "Open Gate.io in the official website or app.",
    "Review withdrawal settings, address allowlist, and security confirmations.",
    "Create a dedicated withdrawal API key only if you intentionally want API withdrawals.",
    "Restrict the key with address allowlist and IP restrictions whenever available.",
    "Keep trading API keys separate from withdrawal API keys.",
  ];
}

function maskAddress(address: string): string {
  if (address.length <= 12) {
    return address;
  }

  return `${address.slice(0, 6)}...${address.slice(-6)}`;
}
