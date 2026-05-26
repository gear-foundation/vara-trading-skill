import { createExchange } from "../exchanges/exchangeFactory.js";
import { CcxtAdapter } from "../exchanges/ccxtAdapter.js";
import { printOk } from "../json.js";
import type { CexProvider } from "../types.js";

export async function ticker(provider: CexProvider, symbol: string): Promise<void> {
  const exchange = createExchange(provider);
  const adapter = new CcxtAdapter(exchange, provider);

  const result = await adapter.ticker(symbol);

  printOk({
    provider,
    symbol,
    ticker: result,
  });
}
