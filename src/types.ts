export type IntegrationType =
  | "cex_trading"
  | "fiat_onramp"
  | "instant_swap"
  | "vara_wallet"
  | "route_aggregator";

export type CexProvider =
  | "mexc"
  | "gateio"
  | "coinbase"
  | "cryptocom";

export type Provider =
  | CexProvider
  | "banxa"
  | "exolix"
  | "vara";

export type TradeSide = "buy" | "sell";

export type ExecutionMode = "dry-run" | "live";

export type TradingRoute =
  | {
      type: "cex_trading";
      provider: CexProvider;
      asset: string;
      symbol: string;
      side: TradeSide;
      quote: string;
      requiresApiKey: true;
      notes?: string[];
    }
  | {
      type: "instant_swap";
      provider: "exolix";
      fromAsset: string;
      toAsset: string;
      requiresWalletAddress: true;
      requiresDeposit: true;
      notes?: string[];
    }
  | {
      type: "fiat_onramp";
      provider: "banxa";
      fiat: string;
      crypto: string;
      requiresWalletAddress: true;
      returnsCheckoutUrl: true;
      notes?: string[];
    };

export type VaraRoute = TradingRoute;
