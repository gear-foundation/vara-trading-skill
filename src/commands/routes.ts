import { getAllowedExchanges, getAllowedQuotes } from "../config.js";
import { printOk } from "../json.js";
import type { TradeSide, TradingRoute } from "../types.js";

export function routes(
  side: TradeSide,
  quote: string,
  amount: string,
  asset = "VARA",
): void {
  const allowedExchanges = getAllowedExchanges().map((exchange) => exchange.toLowerCase());
  const allowedQuotes = getAllowedQuotes().map((allowedQuote) => allowedQuote.toUpperCase());
  const base = normalizeAsset(asset);
  const q = quote.toUpperCase();

  if (base === q) {
    throw new Error(`Asset and quote must differ. Received ${base}/${q}`);
  }

  if (allowedQuotes.length > 0 && !allowedQuotes.includes(q)) {
    throw new Error(`Quote ${q} is not allowed. Allowed quotes: ${allowedQuotes.join(", ")}`);
  }

  const result: TradingRoute[] = [];

  if (allowedExchanges.includes("mexc") && q === "USDT") {
    result.push({
      type: "cex_trading",
      provider: "mexc",
      asset: base,
      symbol: `${base}/${q}`,
      side,
      quote: q,
      requiresApiKey: true,
      notes: ["Run check-market before execution to confirm the pair exists and is active"],
    });
  }

  if (allowedExchanges.includes("gateio") && q === "USDT") {
    result.push({
      type: "cex_trading",
      provider: "gateio",
      asset: base,
      symbol: `${base}/${q}`,
      side,
      quote: q,
      requiresApiKey: true,
      notes: ["Run check-market before execution to confirm the pair exists and is active"],
    });
  }

  if (allowedExchanges.includes("coinbase") && ["USD", "USDC", "EUR"].includes(q)) {
    result.push({
      type: "cex_trading",
      provider: "coinbase",
      asset: base,
      symbol: `${base}/${q}`,
      side,
      quote: q,
      requiresApiKey: true,
      notes: ["Market existence must be checked with loadMarkets before execution"],
    });
  }

  if (allowedExchanges.includes("cryptocom") && ["USD", "USDT"].includes(q)) {
    result.push({
      type: "cex_trading",
      provider: "cryptocom",
      asset: base,
      symbol: `${base}/${q}`,
      side,
      quote: q,
      requiresApiKey: true,
      notes: ["Market existence must be checked with loadMarkets before execution"],
    });
  }

  if (allowedExchanges.includes("exolix")) {
    result.push({
      type: "instant_swap",
      provider: "exolix",
      fromAsset: q,
      toAsset: base,
      requiresWalletAddress: true,
      requiresDeposit: true,
      notes: ["Not implemented in the first release"],
    });
  }

  if (allowedExchanges.includes("banxa") && ["USD", "EUR", "GBP"].includes(q)) {
    result.push({
      type: "fiat_onramp",
      provider: "banxa",
      fiat: q,
      crypto: base,
      requiresWalletAddress: true,
      returnsCheckoutUrl: true,
      notes: ["Not implemented in the first release"],
    });
  }

  printOk({
    asset: base,
    side,
    quote: q,
    amount,
    routes: result,
  });
}

function normalizeAsset(asset: string): string {
  const normalized = asset.trim().toUpperCase();

  if (!normalized) {
    throw new Error("Asset is required");
  }

  return normalized;
}
