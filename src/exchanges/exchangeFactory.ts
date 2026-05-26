import ccxt, { type Exchange } from "ccxt";
import { getEnv, requireEnv } from "../config.js";
import type { CexProvider } from "../types.js";

type ExchangeConstructor = new (config?: Record<string, unknown>) => Exchange;

const CCXT_EXCHANGE_IDS: Record<CexProvider, string> = {
  mexc: "mexc",
  gateio: "gateio",
  coinbase: "coinbase",
  cryptocom: "cryptocom",
};

const ENV_PREFIXES: Record<CexProvider, string> = {
  mexc: "MEXC",
  gateio: "GATEIO",
  coinbase: "COINBASE",
  cryptocom: "CRYPTOCOM",
};

export function createExchange(provider: CexProvider): Exchange {
  const ExchangeClass = getExchangeClass(provider);
  const prefix = ENV_PREFIXES[provider];
  const config: Record<string, unknown> = {
    enableRateLimit: true,
  };

  const apiKey = getEnv(`${prefix}_API_KEY`);
  const secret = getEnv(`${prefix}_API_SECRET`);

  if (apiKey && secret) {
    config.apiKey = apiKey;
    config.secret = secret;
  }

  return new ExchangeClass(config);
}

export function createWithdrawalExchange(provider: CexProvider): Exchange {
  const ExchangeClass = getExchangeClass(provider);
  const prefix = ENV_PREFIXES[provider];

  return new ExchangeClass({
    apiKey: requireEnv(`${prefix}_WITHDRAW_API_KEY`),
    secret: requireEnv(`${prefix}_WITHDRAW_API_SECRET`),
    enableRateLimit: true,
  });
}

function getExchangeClass(provider: CexProvider): ExchangeConstructor {
  const ccxtId = CCXT_EXCHANGE_IDS[provider];

  if (!ccxtId) {
    throw new Error(`Unsupported provider: ${provider}`);
  }

  const exchangeClass = (ccxt as unknown as Record<string, ExchangeConstructor>)[ccxtId];

  if (!exchangeClass) {
    throw new Error(`CCXT exchange class not found: ${ccxtId}`);
  }

  return exchangeClass;
}
