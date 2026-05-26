import { createExchange } from "../exchanges/exchangeFactory.js";
import { CcxtAdapter, type NormalizedOrder } from "../exchanges/ccxtAdapter.js";
import { printOk } from "../json.js";
import { readOnboardingState } from "../onboarding.js";
import type { CexProvider } from "../types.js";

type OrderCounts = {
  open: number;
  closed: number;
  canceled: number;
  other: number;
};

type GroupedOrders = {
  counts: OrderCounts;
  open_orders: NormalizedOrder[];
  closed_orders: NormalizedOrder[];
  canceled_orders: NormalizedOrder[];
  other_orders: NormalizedOrder[];
};

export async function orders(
  provider: CexProvider,
  symbolsInput?: string,
  limitInput?: string,
): Promise<void> {
  const symbols = resolveSymbols(symbolsInput);
  const limit = positiveInteger(limitInput ?? "50", "limit");
  const exchange = createExchange(provider);
  const adapter = new CcxtAdapter(exchange, provider);
  const allOrders: NormalizedOrder[] = [];
  const results: Array<{ symbol: string; counts: OrderCounts; orders: NormalizedOrder[] }> = [];

  for (const symbol of symbols) {
    const symbolOrders = await adapter.orders(symbol, limit);
    allOrders.push(...symbolOrders);

    results.push({
      symbol,
      counts: groupOrders(symbolOrders).counts,
      orders: symbolOrders,
    });
  }

  const grouped = groupOrders(allOrders);

  printOk({
    action: "orders",
    provider,
    symbols,
    limit,
    ...grouped,
    results,
  });
}

export async function openOrders(
  provider: CexProvider,
  symbolsInput?: string,
  limitInput?: string,
): Promise<void> {
  const symbols = resolveSymbols(symbolsInput);
  const limit = positiveInteger(limitInput ?? "50", "limit");
  const exchange = createExchange(provider);
  const adapter = new CcxtAdapter(exchange, provider);
  const allOrders: NormalizedOrder[] = [];
  const results: Array<{ symbol: string; count: number; orders: NormalizedOrder[] }> = [];

  for (const symbol of symbols) {
    const symbolOrders = await adapter.openOrders(symbol, limit);
    allOrders.push(...symbolOrders);

    results.push({
      symbol,
      count: symbolOrders.length,
      orders: symbolOrders,
    });
  }

  printOk({
    action: "open_orders",
    provider,
    symbols,
    limit,
    count: allOrders.length,
    open_orders: allOrders,
    results,
  });
}

function resolveSymbols(symbolsInput?: string): string[] {
  const explicitSymbols = csv(symbolsInput);

  if (explicitSymbols.length > 0) {
    return explicitSymbols;
  }

  const state = readOnboardingState();
  const allowedPairs = state.riskLimits?.allowedPairs.map(normalizeSymbol) ?? [];

  if (allowedPairs.length === 0) {
    throw new Error(
      "No symbols provided and no onboarding allowed pairs found. Pass --symbols VARA/USDT,USDC/USDT or configure onboarding risk limits.",
    );
  }

  return unique(allowedPairs);
}

function groupOrders(orders: NormalizedOrder[]): GroupedOrders {
  const grouped: GroupedOrders = {
    counts: {
      open: 0,
      closed: 0,
      canceled: 0,
      other: 0,
    },
    open_orders: [],
    closed_orders: [],
    canceled_orders: [],
    other_orders: [],
  };

  for (const order of orders) {
    const status = order.status?.toLowerCase();

    if (status === "open") {
      grouped.counts.open += 1;
      grouped.open_orders.push(order);
    } else if (status === "closed") {
      grouped.counts.closed += 1;
      grouped.closed_orders.push(order);
    } else if (status === "canceled" || status === "cancelled") {
      grouped.counts.canceled += 1;
      grouped.canceled_orders.push(order);
    } else {
      grouped.counts.other += 1;
      grouped.other_orders.push(order);
    }
  }

  return grouped;
}

function csv(value?: string): string[] {
  if (!value) {
    return [];
  }

  return unique(
    value
      .split(",")
      .map(normalizeSymbol)
      .filter(Boolean),
  );
}

function normalizeSymbol(symbol: string): string {
  return symbol.trim().toUpperCase();
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function positiveInteger(value: string, name: string): number {
  const number = Number(value);

  if (!Number.isInteger(number) || number <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }

  return number;
}
