import path from "node:path";
import os from "node:os";
import dotenv from "dotenv";

const envPath = path.join(os.homedir(), ".vara-trading-agent", ".env");

dotenv.config({ path: envPath });

export function getEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value.trim() : undefined;
}

export function requireEnv(name: string): string {
  const value = getEnv(name);

  if (!value) {
    throw new Error(`Missing required env variable: ${name}`);
  }

  return value;
}

export function getCsvEnv(name: string): string[] {
  const value = getEnv(name);

  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

export function isDryRun(): boolean {
  return getEnv("VARA_AGENT_DRY_RUN") !== "false";
}

export function getMaxOrderUsd(): string {
  return getEnv("VARA_AGENT_MAX_ORDER_USD") ?? "0";
}

export function getAllowedExchanges(): string[] {
  const exchanges = getCsvEnv("VARA_AGENT_ALLOWED_EXCHANGES");
  const activeExchanges = ["mexc", "gateio"];

  if (getEnv("VARA_AGENT_ENABLE_FUTURE_PROVIDERS") === "true") {
    return exchanges.length > 0 ? exchanges : activeExchanges;
  }

  return exchanges.length > 0
    ? exchanges.filter((exchange) => activeExchanges.includes(exchange))
    : activeExchanges;
}

export function getAllowedQuotes(): string[] {
  return getCsvEnv("VARA_AGENT_ALLOWED_QUOTES");
}

export function isWithdrawalEnabled(): boolean {
  return getEnv("VARA_AGENT_ENABLE_WITHDRAWALS") === "true";
}

export function getAllowedWithdrawAssets(): string[] {
  return getCsvEnv("VARA_AGENT_ALLOWED_WITHDRAW_ASSETS").map((asset) => asset.toUpperCase());
}

export function getAllowedWithdrawNetworks(): string[] {
  return getCsvEnv("VARA_AGENT_ALLOWED_WITHDRAW_NETWORKS").map((network) => network.toUpperCase());
}

export function getAllowedWithdrawAddresses(): string[] {
  return getCsvEnv("VARA_AGENT_ALLOWED_WITHDRAW_ADDRESSES");
}

export function getMaxWithdrawAmount(asset: string): string {
  return getEnv(`VARA_AGENT_MAX_WITHDRAW_${asset.toUpperCase()}`) ?? "0";
}
