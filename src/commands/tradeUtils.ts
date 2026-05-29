import { isDryRun } from "../config.js";
import type { ExecutionMode } from "../types.js";

export type ParsedSymbol = {
  base: string;
  quote: string;
};

export function resolveDryRun(mode?: ExecutionMode): boolean {
  if (!mode) {
    return isDryRun();
  }

  if (mode !== "dry-run" && mode !== "live") {
    throw new Error('Execution mode must be "dry-run" or "live"');
  }

  return mode === "dry-run";
}

export function parseSymbol(symbol: string): ParsedSymbol {
  const [base, quote] = symbol.toUpperCase().split("/");

  if (!base || !quote) {
    throw new Error(`Invalid market symbol: ${symbol}`);
  }

  return { base, quote };
}

export function isUsdLikeQuote(quote: string): boolean {
  return ["USD", "USDT", "USDC"].includes(quote.toUpperCase());
}
