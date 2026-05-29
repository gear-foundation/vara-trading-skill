import assert from "node:assert/strict";
import test from "node:test";

import { getEnv } from "../../src/config.ts";
import { createExchange } from "../../src/exchanges/exchangeFactory.ts";
import { CcxtAdapter } from "../../src/exchanges/ccxtAdapter.ts";
import type { CexProvider } from "../../src/types.ts";

const shouldRunLiveTests = process.env.RUN_LIVE_CEX_TESTS === "true";

test("read-only CEX integration checks", {
  skip: shouldRunLiveTests ? false : "Set RUN_LIVE_CEX_TESTS=true to run live read-only CEX checks.",
}, async (t) => {
  const providers = selectedProviders();

  for (const provider of providers) {
    await t.test(provider, async () => {
      assertCredentialsConfigured(provider);

      const exchange = createExchange(provider);
      const adapter = new CcxtAdapter(exchange, provider);

      const markets = await exchange.loadMarkets();
      assert.ok(Object.keys(markets).length > 0, `${provider}: expected markets to load`);

      const market = await adapter.checkMarket("VARA/USDT") as Record<string, unknown>;
      assert.equal(market.symbol, "VARA/USDT");
      assert.notEqual(market.active, false);

      const balance = await adapter.balanceSummary();
      assert.equal(balance.provider, provider);
      assert.ok(Number.isInteger(balance.non_zero_count));

      const ticker = await adapter.ticker("VARA/USDT") as Record<string, unknown>;
      assert.ok(
        ticker.bid !== undefined ||
          ticker.ask !== undefined ||
          ticker.last !== undefined ||
          ticker.timestamp !== undefined,
        `${provider}: expected ticker to include bid, ask, last, or timestamp`,
      );

      const orderBook = await adapter.orderBook("VARA/USDT", 5) as Record<string, unknown>;
      assert.equal(orderBook.symbol, "VARA/USDT");
      assert.ok(Array.isArray(orderBook.bids), `${provider}: expected bids array`);
      assert.ok(Array.isArray(orderBook.asks), `${provider}: expected asks array`);

      const openOrders = await adapter.openOrders("VARA/USDT", 10);
      assert.ok(Array.isArray(openOrders), `${provider}: expected open orders array`);

      const orders = await adapter.orders("VARA/USDT", 10);
      assert.ok(Array.isArray(orders), `${provider}: expected order history array`);

      console.log(`${provider} read-only OK: markets loaded, VARA/USDT active, balance/ticker/orderbook/orders readable`);
    });
  }
});

function selectedProviders(): CexProvider[] {
  const rawProvider = (process.env.CEX_PROVIDER ?? "mexc").trim().toLowerCase();

  if (rawProvider === "both") {
    return ["mexc", "gateio"];
  }

  if (rawProvider === "mexc" || rawProvider === "gateio") {
    return [rawProvider];
  }

  throw new Error('CEX_PROVIDER must be "mexc", "gateio", or "both"');
}

function assertCredentialsConfigured(provider: CexProvider): void {
  const prefix = provider === "mexc" ? "MEXC" : "GATEIO";
  const missing = [`${prefix}_API_KEY`, `${prefix}_API_SECRET`].filter(
    (name) => !getEnv(name),
  );

  if (missing.length > 0) {
    throw new Error(
      `${provider}: missing ${missing.join(", ")} in ~/.vara-trading-agent/.env`,
    );
  }
}
