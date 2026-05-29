import type { CurrencyInterface, Exchange, Market } from "ccxt";
import { Decimal } from "decimal.js";
import { getMaxOrderUsd } from "../config.js";

type OrderBookLevel = {
  price: string;
  amount: string;
  total: string;
};

export type NormalizedOrder = {
  id: string | null;
  client_order_id: string | null;
  timestamp: number | null;
  datetime: string | null;
  symbol: string | null;
  type: string | null;
  side: string | null;
  price: string | null;
  amount: string | null;
  filled: string | null;
  remaining: string | null;
  cost: string | null;
  average: string | null;
  status: string | null;
  fee: unknown;
};

export type NormalizedBalance = {
  asset: string;
  free: string;
  used: string;
  total: string;
};

export type BalanceSummary = {
  provider: string;
  non_zero_count: number;
  balances: NormalizedBalance[];
  message?: string;
};

export class CcxtAdapter {
  constructor(
    private readonly exchange: Exchange,
    private readonly provider: string,
  ) {}

  async loadMarket(symbol: string): Promise<Market> {
    await this.exchange.loadMarkets();

    const market = this.exchange.market(symbol);

    if (!market) {
      throw new Error(`Market not found on ${this.provider}: ${symbol}`);
    }

    if (market.active === false) {
      throw new Error(`Market is not active on ${this.provider}: ${symbol}`);
    }

    return market;
  }

  async balance(): Promise<unknown> {
    return await this.exchange.fetchBalance();
  }

  async balanceSummary(): Promise<BalanceSummary> {
    const balance = await this.exchange.fetchBalance();
    return normalizeBalance(balance, this.provider);
  }

  async marketsSummary(): Promise<Record<string, unknown>> {
    const markets = await this.exchange.loadMarkets();

    return {
      provider: this.provider,
      markets_count: Object.keys(markets).length,
    };
  }

  async ticker(symbol: string): Promise<unknown> {
    await this.loadMarket(symbol);
    return await this.exchange.fetchTicker(symbol);
  }

  async orderBook(symbol: string, limit: number): Promise<unknown> {
    await this.loadMarket(symbol);

    if (this.exchange.has["fetchOrderBook"] === false) {
      throw new Error(`Order book is not supported on ${this.provider}`);
    }

    const orderBook = await this.exchange.fetchOrderBook(symbol, limit);
    const bids = normalizeLevels(orderBook.bids ?? [], limit);
    const asks = normalizeLevels(orderBook.asks ?? [], limit);
    const bestBid = bids[0];
    const bestAsk = asks[0];
    const spread =
      bestBid && bestAsk
        ? new Decimal(bestAsk.price).minus(bestBid.price)
        : undefined;
    const spreadPct =
      spread && bestAsk
        ? spread.div(new Decimal(bestAsk.price)).mul(100)
        : undefined;

    return {
      provider: this.provider,
      symbol,
      timestamp: orderBook.timestamp,
      datetime: orderBook.datetime,
      nonce: orderBook.nonce,
      limit,
      best_bid: bestBid ?? null,
      best_ask: bestAsk ?? null,
      spread: spread?.toString() ?? null,
      spread_pct: spreadPct?.toDecimalPlaces(6).toString() ?? null,
      bids,
      asks,
    };
  }

  async checkMarket(symbol: string): Promise<unknown> {
    await this.exchange.loadMarkets();

    const market = this.exchange.market(symbol);

    if (!market) {
      throw new Error(`Market not found on ${this.provider}: ${symbol}`);
    }

    return {
      provider: this.provider,
      symbol,
      id: market.id,
      active: market.active,
      base: market.base,
      quote: market.quote,
      type: market.type,
      spot: market.spot,
      margin: market.margin,
      swap: market.swap,
      precision: market.precision,
      limits: market.limits,
      taker: market.taker,
      maker: market.maker,
    };
  }

  async orders(symbol: string, limit: number): Promise<NormalizedOrder[]> {
    await this.loadMarket(symbol);

    if (this.exchange.has["fetchOrders"] === false) {
      throw new Error(`Order history is not supported on ${this.provider}`);
    }

    const orders = await this.exchange.fetchOrders(symbol, undefined, limit);
    return orders.map(normalizeOrder);
  }

  async openOrders(symbol: string, limit: number): Promise<NormalizedOrder[]> {
    await this.loadMarket(symbol);

    if (this.exchange.has["fetchOpenOrders"] === false) {
      throw new Error(`Open orders are not supported on ${this.provider}`);
    }

    const orders = await this.exchange.fetchOpenOrders(symbol, undefined, limit);
    return orders.map(normalizeOrder);
  }

  async cancelOrder(symbol: string, orderId: string): Promise<unknown> {
    await this.loadMarket(symbol);

    if (this.exchange.has["cancelOrder"] === false) {
      throw new Error(`Order cancellation is not supported on ${this.provider}`);
    }

    return await this.exchange.cancelOrder(orderId, symbol);
  }

  async withdrawalInfo(
    asset: string,
    network: string | undefined,
    amount: string | undefined,
    address: string | undefined,
  ): Promise<unknown> {
    const code = asset.toUpperCase();
    const networkCode = network?.toUpperCase();
    const currencies = await this.loadCurrencies();
    const currency = currencies[code];
    const balance = await this.exchange.fetchBalance();
    const assetBalance = balance[code];

    return {
      provider: this.provider,
      asset: code,
      network: networkCode ?? null,
      amount: amount ?? null,
      address: address ? maskAddress(address) : null,
      withdraw_supported: this.exchange.has["withdraw"] !== false,
      currency: currency
        ? normalizeCurrency(currency, networkCode)
        : null,
      balance: assetBalance
        ? {
            free: decimalOrNull(assetBalance.free),
            used: decimalOrNull(assetBalance.used),
            total: decimalOrNull(assetBalance.total),
          }
        : null,
    };
  }

  async withdraw(
    asset: string,
    amount: string,
    address: string,
    tag: string | undefined,
    network: string | undefined,
  ): Promise<unknown> {
    if (this.exchange.has["withdraw"] === false) {
      throw new Error(`Withdrawals are not supported on ${this.provider}`);
    }

    const params = network ? { network: network.toUpperCase() } : {};

    return await this.exchange.withdraw(
      asset.toUpperCase(),
      new Decimal(amount).toNumber(),
      address,
      tag,
      params,
    );
  }

  assertMaxQuoteAmount(quoteAmount: string): void {
    const max = new Decimal(getMaxOrderUsd());
    const amount = new Decimal(quoteAmount);

    if (max.gt(0) && amount.gt(max)) {
      throw new Error(
        `Order quote amount ${amount.toString()} exceeds VARA_AGENT_MAX_ORDER_USD=${max.toString()} USD. Lower the quote amount or update the local risk limit in ~/.vara-trading-agent/.env.`,
      );
    }
  }

  async estimateBaseAmount(symbol: string, quoteAmount: string): Promise<string> {
    await this.loadMarket(symbol);

    const ticker = await this.exchange.fetchTicker(symbol);
    const price = ticker.last ?? ticker.ask;

    if (!price) {
      throw new Error(`Cannot estimate price for ${symbol}`);
    }

    const rawAmount = new Decimal(quoteAmount).div(new Decimal(String(price)));
    return this.exchange.amountToPrecision(symbol, rawAmount.toString());
  }

  async estimateQuoteAmount(symbol: string, baseAmount: string): Promise<string> {
    await this.loadMarket(symbol);

    const ticker = await this.exchange.fetchTicker(symbol);
    const price = ticker.last ?? ticker.bid;

    if (!price) {
      throw new Error(`Cannot estimate price for ${symbol}`);
    }

    return new Decimal(baseAmount).mul(new Decimal(String(price))).toDecimalPlaces(8).toString();
  }

  async marketBuyByQuoteAmount(
    symbol: string,
    quoteAmount: string,
    dryRun: boolean,
  ): Promise<unknown> {
    this.assertMaxQuoteAmount(quoteAmount);

    const market = await this.loadMarket(symbol);

    const estimatedBaseAmount = await this.estimateBaseAmount(symbol, quoteAmount);
    assertMarketLimits({
      provider: this.provider,
      market,
      symbol,
      amount: estimatedBaseAmount,
      cost: quoteAmount,
    });

    if (dryRun) {
      return {
        dry_run: true,
        provider: this.provider,
        symbol,
        side: "buy",
        type: "market",
        quote_amount: quoteAmount,
        estimated_base_amount: estimatedBaseAmount,
        message: "Dry run only. No real order was placed.",
      };
    }

    if (this.exchange.has["createMarketBuyOrderWithCost"]) {
      const fn = this.exchange.createMarketBuyOrderWithCost?.bind(this.exchange);

      if (!fn) {
        throw new Error("createMarketBuyOrderWithCost is marked as supported but method is missing");
      }

      return normalizeOrder(await fn(symbol, new Decimal(quoteAmount).toNumber()));
    }

    return normalizeOrder(await this.exchange.createMarketBuyOrder(symbol, new Decimal(estimatedBaseAmount).toNumber()));
  }

  async limitBuyByQuoteAmount(
    symbol: string,
    quoteAmount: string,
    price: string,
    dryRun: boolean,
  ): Promise<unknown> {
    this.assertMaxQuoteAmount(quoteAmount);

    const market = await this.loadMarket(symbol);

    const precisePrice = this.exchange.priceToPrecision(symbol, price);
    const rawAmount = new Decimal(quoteAmount).div(new Decimal(precisePrice));
    const preciseAmount = this.exchange.amountToPrecision(symbol, rawAmount.toString());
    const estimatedCost = new Decimal(preciseAmount).mul(new Decimal(precisePrice)).toString();
    assertMarketLimits({
      provider: this.provider,
      market,
      symbol,
      amount: preciseAmount,
      price: precisePrice,
      cost: estimatedCost,
    });

    if (dryRun) {
      return {
        dry_run: true,
        provider: this.provider,
        symbol,
        side: "buy",
        type: "limit",
        quote_amount: quoteAmount,
        limit_price: precisePrice,
        base_amount: preciseAmount,
        estimated_cost: estimatedCost,
        message: "Dry run only. No real order was placed.",
      };
    }

    return normalizeOrder(await this.exchange.createLimitBuyOrder(
      symbol,
      new Decimal(preciseAmount).toNumber(),
      new Decimal(precisePrice).toNumber(),
    ));
  }

  async marketSellBaseAmount(
    symbol: string,
    baseAmount: string,
    dryRun: boolean,
  ): Promise<unknown> {
    const market = await this.loadMarket(symbol);

    const preciseAmount = this.exchange.amountToPrecision(symbol, baseAmount);
    const estimatedQuoteAmount = await this.estimateQuoteAmount(symbol, preciseAmount);
    assertMarketLimits({
      provider: this.provider,
      market,
      symbol,
      amount: preciseAmount,
      cost: estimatedQuoteAmount,
    });

    if (dryRun) {
      return {
        dry_run: true,
        provider: this.provider,
        symbol,
        side: "sell",
        type: "market",
        base_amount: preciseAmount,
        estimated_quote_amount: estimatedQuoteAmount,
        message: "Dry run only. No real order was placed.",
      };
    }

    return normalizeOrder(await this.exchange.createMarketSellOrder(symbol, new Decimal(preciseAmount).toNumber()));
  }

  async limitSellBaseAmount(
    symbol: string,
    baseAmount: string,
    price: string,
    dryRun: boolean,
  ): Promise<unknown> {
    const market = await this.loadMarket(symbol);

    const preciseAmount = this.exchange.amountToPrecision(symbol, baseAmount);
    const precisePrice = this.exchange.priceToPrecision(symbol, price);
    const estimatedCost = new Decimal(preciseAmount).mul(new Decimal(precisePrice)).toString();
    assertMarketLimits({
      provider: this.provider,
      market,
      symbol,
      amount: preciseAmount,
      price: precisePrice,
      cost: estimatedCost,
    });

    if (dryRun) {
      return {
        dry_run: true,
        provider: this.provider,
        symbol,
        side: "sell",
        type: "limit",
        base_amount: preciseAmount,
        limit_price: precisePrice,
        estimated_quote_amount: estimatedCost,
        message: "Dry run only. No real order was placed.",
      };
    }

    return normalizeOrder(await this.exchange.createLimitSellOrder(
      symbol,
      new Decimal(preciseAmount).toNumber(),
      new Decimal(precisePrice).toNumber(),
    ));
  }

  private async loadCurrencies(): Promise<Record<string, CurrencyInterface>> {
    if (this.exchange.has["fetchCurrencies"] !== false) {
      try {
        return await this.exchange.fetchCurrencies();
      } catch {
        // Some exchanges expose currencies only after loading markets.
      }
    }

    await this.exchange.loadMarkets();
    return (this.exchange.currencies ?? {}) as Record<string, CurrencyInterface>;
  }
}

function normalizeLevels(levels: readonly unknown[], limit: number): OrderBookLevel[] {
  return levels.slice(0, limit).map((level) => {
    if (!Array.isArray(level) || level.length < 2) {
      throw new Error("Unexpected order book level format");
    }

    const price = new Decimal(String(level[0]));
    const amount = new Decimal(String(level[1]));

    return {
      price: price.toString(),
      amount: amount.toString(),
      total: price.mul(amount).toString(),
    };
  });
}

function assertMarketLimits(input: {
  provider: string;
  market: Market;
  symbol: string;
  amount: string;
  price?: string;
  cost: string;
}): void {
  const market = input.market;

  if (!market) {
    return;
  }

  const amount = new Decimal(input.amount);
  const cost = new Decimal(input.cost);
  const minAmount = decimalOrUndefined(market.limits?.amount?.min);
  const maxAmount = decimalOrUndefined(market.limits?.amount?.max);
  const minCost = decimalOrUndefined(market.limits?.cost?.min);
  const maxCost = decimalOrUndefined(market.limits?.cost?.max);
  const base = market.base ?? input.symbol.split("/")[0] ?? "base";
  const quote = market.quote ?? input.symbol.split("/")[1] ?? "quote";

  if (minAmount && amount.lt(minAmount)) {
    throw new Error(
      `Order amount ${amount.toString()} ${base} is below ${input.provider} minimum ${minAmount.toString()} ${base} for ${input.symbol}. Increase the base amount before submitting.`,
    );
  }

  if (maxAmount && amount.gt(maxAmount)) {
    throw new Error(
      `Order amount ${amount.toString()} ${base} exceeds ${input.provider} maximum ${maxAmount.toString()} ${base} for ${input.symbol}. Lower the base amount before submitting.`,
    );
  }

  if (minCost && cost.lt(minCost)) {
    throw new Error(
      `Order cost ${cost.toString()} ${quote} is below ${input.provider} minimum ${minCost.toString()} ${quote} for ${input.symbol}. Increase the quote amount before submitting.`,
    );
  }

  if (maxCost && cost.gt(maxCost)) {
    throw new Error(
      `Order cost ${cost.toString()} ${quote} exceeds ${input.provider} maximum ${maxCost.toString()} ${quote} for ${input.symbol}. Lower the quote amount before submitting.`,
    );
  }
}

export function normalizeOrder(order: unknown): NormalizedOrder {
  const record = asRecord(order);

  return {
    id: stringOrNull(record.id ?? record.orderId),
    client_order_id: stringOrNull(
      record.clientOrderId ?? record.client_order_id ?? record.clientOrderID,
    ),
    timestamp: typeof record.timestamp === "number" ? record.timestamp : null,
    datetime: stringOrNull(record.datetime),
    symbol: stringOrNull(record.symbol),
    type: stringOrNull(record.type),
    side: stringOrNull(record.side),
    price: decimalOrNull(record.price),
    amount: decimalOrNull(record.amount),
    filled: decimalOrNull(record.filled),
    remaining: decimalOrNull(record.remaining),
    cost: decimalOrNull(record.cost),
    average: decimalOrNull(record.average),
    status: stringOrNull(record.status),
    fee: record.fee ?? record.fees ?? null,
  };
}

function decimalOrUndefined(value: unknown): Decimal | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  try {
    return new Decimal(String(value));
  } catch {
    return undefined;
  }
}

function stringOrNull(value: unknown): string | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  return String(value);
}

function normalizeBalance(rawBalance: unknown, provider: string): BalanceSummary {
  const balance = asRecord(rawBalance);
  const free = asRecord(balance.free);
  const used = asRecord(balance.used);
  const total = asRecord(balance.total);
  const assets = new Set<string>([
    ...Object.keys(free),
    ...Object.keys(used),
    ...Object.keys(total),
  ]);

  for (const [asset, value] of Object.entries(balance)) {
    if (isBalanceMetadataKey(asset)) {
      continue;
    }

    const assetBalance = asRecord(value);

    if ("free" in assetBalance || "used" in assetBalance || "total" in assetBalance) {
      assets.add(asset);
    }
  }

  const balances = [...assets]
    .map((asset) => {
      const assetBalance = asRecord(balance[asset]);

      return {
        asset,
        free: decimalOrZero(free[asset] ?? assetBalance.free),
        used: decimalOrZero(used[asset] ?? assetBalance.used),
        total: decimalOrZero(total[asset] ?? assetBalance.total),
      };
    })
    .filter(hasNonZeroBalance)
    .sort((a, b) => a.asset.localeCompare(b.asset));

  return {
    provider,
    non_zero_count: balances.length,
    balances,
    ...(balances.length === 0
      ? { message: "No non-zero balances found." }
      : {}),
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function isBalanceMetadataKey(key: string): boolean {
  return [
    "free",
    "used",
    "total",
    "info",
    "timestamp",
    "datetime",
  ].includes(key);
}

function hasNonZeroBalance(balance: NormalizedBalance): boolean {
  return [balance.free, balance.used, balance.total].some((value) =>
    new Decimal(value).abs().gt(0),
  );
}

function decimalOrZero(value: unknown): string {
  if (value === undefined || value === null || value === "") {
    return "0";
  }

  try {
    return new Decimal(String(value)).toString();
  } catch {
    return "0";
  }
}

function decimalOrNull(value: unknown): string | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  try {
    return new Decimal(String(value)).toString();
  } catch {
    return String(value);
  }
}

function normalizeCurrency(
  currency: CurrencyInterface,
  network: string | undefined,
): Record<string, unknown> {
  const networks = currency.networks ?? {};
  const selectedNetwork = network ? networks[network] : undefined;

  return {
    id: currency.id,
    code: currency.code,
    active: currency.active ?? null,
    deposit: currency.deposit ?? null,
    withdraw: currency.withdraw ?? null,
    fee: decimalOrNull(currency.fee),
    precision: currency.precision ?? null,
    limits: currency.limits ?? null,
    selected_network: selectedNetwork
      ? normalizeNetwork(selectedNetwork)
      : null,
    available_networks: Object.keys(networks),
  };
}

function normalizeNetwork(network: Record<string, unknown>): Record<string, unknown> {
  return {
    id: network.id ?? null,
    network: network.network ?? null,
    active: network.active ?? null,
    deposit: network.deposit ?? null,
    withdraw: network.withdraw ?? null,
    fee: decimalOrNull(network.fee),
    limits: network.limits ?? null,
  };
}

function maskAddress(address: string): string {
  if (address.length <= 12) {
    return address;
  }

  return `${address.slice(0, 6)}...${address.slice(-6)}`;
}
