import assert from "node:assert/strict";
import test from "node:test";
import type { Exchange } from "ccxt";

import { CcxtAdapter, normalizeOrder } from "../src/exchanges/ccxtAdapter.ts";

test("normalizeOrder handles incomplete MEXC order responses", () => {
  assert.deepEqual(normalizeOrder({
    id: "C02__688746036201476096039",
    symbol: "VARA/USDT",
    type: "limit",
    side: "sell",
    price: "0.000604",
    amount: "1700",
    trades: [],
  }), {
    id: "C02__688746036201476096039",
    client_order_id: null,
    timestamp: null,
    datetime: null,
    symbol: "VARA/USDT",
    type: "limit",
    side: "sell",
    price: "0.000604",
    amount: "1700",
    filled: null,
    remaining: null,
    cost: null,
    average: null,
    status: null,
    fee: null,
  });
});

test("normalizeOrder handles full Gate.io order responses and treats ids as strings", () => {
  assert.deepEqual(normalizeOrder({
    id: 1070875885090,
    clientOrderId: "vara-agent-1",
    timestamp: 1770000000000,
    datetime: "2026-02-03T00:00:00.000Z",
    symbol: "VARA/USDT",
    type: "limit",
    side: "buy",
    price: 0.000605,
    amount: 3305,
    filled: 0,
    remaining: 3305,
    cost: 0,
    average: undefined,
    status: "open",
    fees: [{ currency: "USDT", cost: "0" }],
  }), {
    id: "1070875885090",
    client_order_id: "vara-agent-1",
    timestamp: 1770000000000,
    datetime: "2026-02-03T00:00:00.000Z",
    symbol: "VARA/USDT",
    type: "limit",
    side: "buy",
    price: "0.000605",
    amount: "3305",
    filled: "0",
    remaining: "3305",
    cost: "0",
    average: null,
    status: "open",
    fee: [{ currency: "USDT", cost: "0" }],
  });
});

test("openOrders normalizes exchange-specific order id formats", async () => {
  const adapter = new CcxtAdapter(fakeExchange({
    fetchOpenOrders: async () => [
      {
        id: "C02__688746036201476096039",
        symbol: "VARA/USDT",
        price: "0.000604",
        amount: "1700",
      },
      {
        id: 1070875885090,
        symbol: "VARA/USDT",
        status: "open",
        price: "0.000605",
        amount: "3305",
      },
    ],
  }), "test");

  const orders = await adapter.openOrders("VARA/USDT", 10);

  assert.equal(orders[0]?.id, "C02__688746036201476096039");
  assert.equal(orders[0]?.status, null);
  assert.equal(orders[1]?.id, "1070875885090");
  assert.equal(orders[1]?.status, "open");
});

test("market buy live response is normalized when MEXC returns sparse create order data", async () => {
  const adapter = new CcxtAdapter(fakeExchange({
    has: {
      createMarketBuyOrderWithCost: true,
    },
    createMarketBuyOrderWithCost: async () => ({
      id: "C02__market-buy",
      symbol: "VARA/USDT",
      type: "market",
      side: "buy",
      amount: 0,
      trades: [],
    }),
  }), "mexc");

  assert.deepEqual(await adapter.marketBuyByQuoteAmount("VARA/USDT", "2", false), {
    id: "C02__market-buy",
    client_order_id: null,
    timestamp: null,
    datetime: null,
    symbol: "VARA/USDT",
    type: "market",
    side: "buy",
    price: null,
    amount: "0",
    filled: null,
    remaining: null,
    cost: null,
    average: null,
    status: null,
    fee: null,
  });
});

test("limit buy live response is normalized when MEXC returns only id price and amount", async () => {
  const adapter = new CcxtAdapter(fakeExchange({
    createLimitBuyOrder: async (_symbol, amount, price) => ({
      id: "C02__limit-buy",
      symbol: "VARA/USDT",
      price,
      amount,
    }),
  }), "mexc");

  assert.deepEqual(await adapter.limitBuyByQuoteAmount("VARA/USDT", "2", "0.000605", false), {
    id: "C02__limit-buy",
    client_order_id: null,
    timestamp: null,
    datetime: null,
    symbol: "VARA/USDT",
    type: null,
    side: null,
    price: "0.000605",
    amount: "3305.785123966942",
    filled: null,
    remaining: null,
    cost: null,
    average: null,
    status: null,
    fee: null,
  });
});

test("market buy pre-flight rejects costs below exchange minimum before create order", async () => {
  let createCalled = false;
  const adapter = new CcxtAdapter(fakeExchange({
    market: () => varaMarket({
      cost: {
        min: 1,
      },
    }),
    createMarketBuyOrderWithCost: async () => {
      createCalled = true;
      return {
        id: "should-not-submit",
      };
    },
    has: {
      createMarketBuyOrderWithCost: true,
    },
  }), "mexc");

  await assert.rejects(
    () => adapter.marketBuyByQuoteAmount("VARA/USDT", "0.5", false),
    /Order cost 0.5 USDT is below mexc minimum 1 USDT for VARA\/USDT/,
  );
  assert.equal(createCalled, false);
});

test("market sell pre-flight rejects base amounts below exchange minimum before create order", async () => {
  let createCalled = false;
  const adapter = new CcxtAdapter(fakeExchange({
    market: () => varaMarket({
      amount: {
        min: 1,
      },
    }),
    createMarketSellOrder: async () => {
      createCalled = true;
      return {
        id: "should-not-submit",
      };
    },
  }), "mexc");

  await assert.rejects(
    () => adapter.marketSellBaseAmount("VARA/USDT", "0.5", false),
    /Order amount 0.5 VARA is below mexc minimum 1 VARA for VARA\/USDT/,
  );
  assert.equal(createCalled, false);
});

test("limit buy pre-flight validates cost after precision", async () => {
  let createCalled = false;
  const adapter = new CcxtAdapter(fakeExchange({
    market: () => varaMarket({
      cost: {
        min: 2,
      },
    }),
    amountToPrecision: () => "3",
    createLimitBuyOrder: async () => {
      createCalled = true;
      return {
        id: "should-not-submit",
      };
    },
  }), "mexc");

  await assert.rejects(
    () => adapter.limitBuyByQuoteAmount("VARA/USDT", "1.9", "0.5", false),
    /Order cost 1.5 USDT is below mexc minimum 2 USDT for VARA\/USDT/,
  );
  assert.equal(createCalled, false);
});

test("limit sell pre-flight validates amount and cost before create order", async () => {
  let createCalled = false;
  const adapter = new CcxtAdapter(fakeExchange({
    market: () => varaMarket({
      amount: {
        min: 10,
      },
      cost: {
        min: 1,
      },
    }),
    createLimitSellOrder: async () => {
      createCalled = true;
      return {
        id: "should-not-submit",
      };
    },
  }), "mexc");

  await assert.rejects(
    () => adapter.limitSellBaseAmount("VARA/USDT", "5", "0.1", false),
    /Order amount 5 VARA is below mexc minimum 10 VARA for VARA\/USDT/,
  );
  assert.equal(createCalled, false);
});

function fakeExchange(overrides: Partial<Exchange> = {}): Exchange {
  return {
    has: {
      fetchOpenOrders: true,
      createMarketBuyOrderWithCost: false,
      ...(overrides.has ?? {}),
    },
    loadMarkets: async () => ({
      "VARA/USDT": {},
    }),
    market: () => varaMarket(),
    fetchTicker: async () => ({
      last: 0.000605,
      ask: 0.000605,
      bid: 0.000604,
    }),
    amountToPrecision: (_symbol: string, amount: string) => amount,
    priceToPrecision: (_symbol: string, price: string) => price,
    fetchOpenOrders: async () => [],
    createMarketBuyOrder: async () => ({
      id: "fallback-market-buy",
    }),
    createLimitBuyOrder: async () => ({
      id: "fallback-limit-buy",
    }),
    ...overrides,
  } as unknown as Exchange;
}

function varaMarket(limits: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    active: true,
    symbol: "VARA/USDT",
    base: "VARA",
    quote: "USDT",
    limits,
  };
}
