import type { CexProvider } from "../types.js";

export function getVaraSymbol(exchange: CexProvider, quote: string): string {
  const q = quote.toUpperCase();

  switch (exchange) {
    case "mexc":
    case "gateio":
    case "coinbase":
    case "cryptocom":
      return `VARA/${q}`;

    default:
      throw new Error(`Unsupported exchange: ${exchange}`);
  }
}
