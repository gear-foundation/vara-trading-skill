import { createExchange } from "../exchanges/exchangeFactory.js";
import { CcxtAdapter } from "../exchanges/ccxtAdapter.js";
import { printOk } from "../json.js";
import type { CexProvider } from "../types.js";

export async function cancelOrder(
  provider: CexProvider,
  symbol: string,
  orderId: string,
  confirmed: boolean,
): Promise<void> {
  if (!confirmed) {
    throw new Error("Order cancellation requires --confirm");
  }

  const exchange = createExchange(provider);
  const adapter = new CcxtAdapter(exchange, provider);
  const result = await adapter.cancelOrder(symbol, orderId);

  printOk({
    action: "cancel_order",
    provider,
    symbol,
    order_id: orderId,
    result,
  });
}
