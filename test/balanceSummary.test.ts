import assert from "node:assert/strict";
import test from "node:test";
import type { Exchange } from "ccxt";

import { CcxtAdapter } from "../src/exchanges/ccxtAdapter.ts";

test("balanceSummary returns only non-zero balances", async () => {
  const adapter = new CcxtAdapter(fakeExchange({
    free: {
      BTC: "0",
      USDT: "12.5",
    },
    used: {
      USDT: "0",
      VARA: "2",
    },
    total: {
      BTC: "0",
      USDT: "12.5",
      VARA: "2",
    },
    info: {
      noisy: true,
    },
  }), "test");

  assert.deepEqual(await adapter.balanceSummary(), {
    provider: "test",
    non_zero_count: 2,
    balances: [
      {
        asset: "USDT",
        free: "12.5",
        used: "0",
        total: "12.5",
      },
      {
        asset: "VARA",
        free: "0",
        used: "2",
        total: "2",
      },
    ],
  });
});

test("balanceSummary handles exchange-specific per-asset entries", async () => {
  const adapter = new CcxtAdapter(fakeExchange({
    USDC: {
      free: "3",
      used: "0",
      total: "3",
    },
    ETH: {
      free: "0",
      used: "0",
      total: "0",
    },
  }), "test");

  assert.deepEqual(await adapter.balanceSummary(), {
    provider: "test",
    non_zero_count: 1,
    balances: [
      {
        asset: "USDC",
        free: "3",
        used: "0",
        total: "3",
      },
    ],
  });
});

test("balanceSummary reports empty accounts clearly", async () => {
  const adapter = new CcxtAdapter(fakeExchange({
    free: {
      USDT: "0",
    },
    used: {
      USDT: "0",
    },
    total: {
      USDT: "0",
    },
  }), "test");

  assert.deepEqual(await adapter.balanceSummary(), {
    provider: "test",
    non_zero_count: 0,
    balances: [],
    message: "No non-zero balances found.",
  });
});

function fakeExchange(balance: unknown): Exchange {
  return {
    fetchBalance: async () => balance,
  } as unknown as Exchange;
}
