import { createExchange } from "../exchanges/exchangeFactory.js";
import { CcxtAdapter } from "../exchanges/ccxtAdapter.js";
import { assertCexLiveTradingReady } from "../onboarding.js";
import { printOk } from "../json.js";
import { isUsdLikeQuote, parseSymbol, resolveDryRun } from "./tradeUtils.js";
import type { CexProvider, ExecutionMode } from "../types.js";

export async function limitBuySpot(
  provider: CexProvider,
  symbol: string,
  quoteAmount: string,
  price: string,
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

  const result = await adapter.limitBuyByQuoteAmount(symbol, quoteAmount, price, dryRun);

  printOk({
    action: "limit_buy_spot",
    provider,
    symbol,
    base,
    quote,
    mode: dryRun ? "dry-run" : "live",
    result,
  });
}
