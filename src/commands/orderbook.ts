import { createExchange } from "../exchanges/exchangeFactory.js";
import { CcxtAdapter } from "../exchanges/ccxtAdapter.js";
import { printOk } from "../json.js";
import type { CexProvider } from "../types.js";

export async function orderbook(
  provider: CexProvider,
  symbol: string,
  limitInput = "10",
): Promise<void> {
  const limit = Number.parseInt(limitInput, 10);

  if (!Number.isInteger(limit) || limit <= 0 || limit > 100) {
    throw new Error("Limit must be an integer from 1 to 100");
  }

  const exchange = createExchange(provider);
  const adapter = new CcxtAdapter(exchange, provider);

  const result = await adapter.orderBook(symbol, limit);

  printOk({
    action: "orderbook",
    provider,
    symbol,
    orderbook: result,
  });
}
