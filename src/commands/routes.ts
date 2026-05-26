import { getAllowedExchanges, getAllowedQuotes } from "../config.js";
import { printOk } from "../json.js";
import type { TradeSide, VaraRoute } from "../types.js";

export function routes(side: TradeSide, quote: string, amount: string): void {
  const allowedExchanges = getAllowedExchanges();
  const allowedQuotes = getAllowedQuotes();
  const q = quote.toUpperCase();

  if (allowedQuotes.length > 0 && !allowedQuotes.includes(q)) {
    throw new Error(`Quote ${q} is not allowed. Allowed quotes: ${allowedQuotes.join(", ")}`);
  }

  const result: VaraRoute[] = [];

  if (allowedExchanges.includes("mexc") && q === "USDT") {
    result.push({
      type: "cex_trading",
      provider: "mexc",
      symbol: "VARA/USDT",
      side,
      quote: q,
      requiresApiKey: true,
    });
  }

  if (allowedExchanges.includes("gateio") && q === "USDT") {
    result.push({
      type: "cex_trading",
      provider: "gateio",
      symbol: "VARA/USDT",
      side,
      quote: q,
      requiresApiKey: true,
    });
  }

  if (allowedExchanges.includes("coinbase") && ["USD", "USDC", "EUR"].includes(q)) {
    result.push({
      type: "cex_trading",
      provider: "coinbase",
      symbol: `VARA/${q}`,
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
      symbol: `VARA/${q}`,
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
      toAsset: "VARA",
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
      crypto: "VARA",
      requiresWalletAddress: true,
      returnsCheckoutUrl: true,
      notes: ["Not implemented in the first release"],
    });
  }

  printOk({
    asset: "VARA",
    side,
    quote: q,
    amount,
    routes: result,
  });
}
