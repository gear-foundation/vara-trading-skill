import { createExchange } from "../exchanges/exchangeFactory.js";
import { CcxtAdapter } from "../exchanges/ccxtAdapter.js";
import { isDryRun } from "../config.js";
import { assertCexLiveTradingReady } from "../onboarding.js";
import { printOk } from "../json.js";
import type { CexProvider, ExecutionMode } from "../types.js";

export async function buySpot(
  provider: CexProvider,
  symbol: string,
  quoteAmount: string,
  mode?: ExecutionMode,
): Promise<void> {
  const dryRun = resolveDryRun(mode);
  const { base, quote } = parseSymbol(symbol);

  if (!dryRun) {
    assertCexLiveTradingReady(
      provider,
      symbol,
      isUsdLikeQuote(quote) ? quoteAmount : undefined,
    );
  }

  const exchange = createExchange(provider);
  const adapter = new CcxtAdapter(exchange, provider);

  const result = await adapter.marketBuyByQuoteAmount(symbol, quoteAmount, dryRun);

  printOk({
    action: "buy_spot",
    provider,
    symbol,
    base,
    quote,
    mode: dryRun ? "dry-run" : "live",
    result,
  });
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

function parseSymbol(symbol: string): { base: string; quote: string } {
  const [base, quote] = symbol.toUpperCase().split("/");

  if (!base || !quote) {
    throw new Error(`Invalid market symbol: ${symbol}`);
  }

  return { base, quote };
}

function isUsdLikeQuote(quote: string): boolean {
  return ["USD", "USDT", "USDC"].includes(quote);
}
