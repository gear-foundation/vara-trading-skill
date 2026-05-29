import { createExchange } from "../exchanges/exchangeFactory.js";
import { CcxtAdapter } from "../exchanges/ccxtAdapter.js";
import { assertCexLiveTradingReady } from "../onboarding.js";
import { printOk } from "../json.js";
import { isUsdLikeQuote, parseSymbol, resolveDryRun } from "./tradeUtils.js";
import type { CexProvider, ExecutionMode } from "../types.js";

export async function sellSpot(
  provider: CexProvider,
  symbol: string,
  baseAmount: string,
  mode?: ExecutionMode,
): Promise<void> {
  const dryRun = resolveDryRun(mode);
  const { base, quote } = parseSymbol(symbol);

  if (!dryRun) {
    assertCexLiveTradingReady(provider, symbol);
  }

  const exchange = createExchange(provider);
  const adapter = new CcxtAdapter(exchange, provider);

  if (!dryRun && isUsdLikeQuote(quote)) {
    const estimatedQuoteAmount = await adapter.estimateQuoteAmount(symbol, baseAmount);
    assertCexLiveTradingReady(provider, symbol, estimatedQuoteAmount);
  }

  const result = await adapter.marketSellBaseAmount(symbol, baseAmount, dryRun);

  printOk({
    action: "sell_spot",
    provider,
    symbol,
    base,
    quote,
    mode: dryRun ? "dry-run" : "live",
    result,
  });
}
