import { createExchange } from "../exchanges/exchangeFactory.js";
import { CcxtAdapter } from "../exchanges/ccxtAdapter.js";
import { printOk } from "../json.js";
import type { CexProvider } from "../types.js";

export async function checkMarket(provider: CexProvider, symbol: string): Promise<void> {
  const exchange = createExchange(provider);
  const adapter = new CcxtAdapter(exchange, provider);

  const result = await adapter.checkMarket(symbol);

  printOk({
    action: "check_market",
    provider,
    symbol,
    market: result,
  });
}
