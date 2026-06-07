// Marketplace pricing helpers. Prices are stored in integer cents.
// NOTE: payments are NOT live yet — this is scaffolding for a future Stripe integration.

const SYMBOLS: Record<string, string> = { USD: "$", EUR: "€", GBP: "£", PLN: "zł" };

export function isPaid(priceCents?: number | null): boolean {
  return typeof priceCents === "number" && priceCents > 0;
}

export function formatPrice(priceCents: number, currency = "USD"): string {
  if (!priceCents || priceCents <= 0) return "Free";
  const amount = (priceCents / 100).toFixed(2);
  const symbol = SYMBOLS[currency] || "";
  return symbol ? `${symbol}${amount}` : `${amount} ${currency}`;
}
