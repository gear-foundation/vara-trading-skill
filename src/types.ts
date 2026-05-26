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

export type VaraRoute =
  | {
      type: "cex_trading";
      provider: CexProvider;
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
      toAsset: "VARA";
      requiresWalletAddress: true;
      requiresDeposit: true;
      notes?: string[];
    }
  | {
      type: "fiat_onramp";
      provider: "banxa";
      fiat: string;
      crypto: "VARA";
      requiresWalletAddress: true;
      returnsCheckoutUrl: true;
      notes?: string[];
    };
