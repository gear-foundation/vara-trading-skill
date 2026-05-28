import { createExchange } from "../exchanges/exchangeFactory.js";
import { CcxtAdapter } from "../exchanges/ccxtAdapter.js";
import { printOk } from "../json.js";
import type { CexProvider } from "../types.js";

export async function balance(provider: CexProvider): Promise<void> {
  const exchange = createExchange(provider);
  const adapter = new CcxtAdapter(exchange, provider);

  const result = await adapter.balanceSummary();

  printOk({
    provider,
    summary: {
      non_zero_count: result.non_zero_count,
      message: result.message ?? "Showing non-zero balances only.",
    },
    balances: result.balances,
  });
}
