export type AppCurrency = "USD" | "USDC" | "CSPR" | "EUR" | "PHP";

const CURRENCY_RATES: Record<AppCurrency, number> = {
  USD: 1,
  USDC: 1,
  CSPR: 6.4,
  EUR: 0.92,
  PHP: 58,
};

const FIAT_CODES: Partial<Record<AppCurrency, string>> = {
  USD: "USD",
  EUR: "EUR",
  PHP: "PHP",
};

export function formatCurrencyAmount(
  usdAmount: number,
  currency: AppCurrency,
  options?: {
    compact?: boolean;
    maximumFractionDigits?: number;
  },
) {
  const converted = usdAmount * CURRENCY_RATES[currency];
  const compact = options?.compact ?? false;
  const maximumFractionDigits = options?.maximumFractionDigits ?? (compact ? 1 : 0);

  if (currency === "USDC" || currency === "CSPR") {
    return `${new Intl.NumberFormat("en-US", {
      notation: compact ? "compact" : "standard",
      maximumFractionDigits,
    }).format(converted)} ${currency}`;
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: FIAT_CODES[currency] ?? "USD",
    notation: compact ? "compact" : "standard",
    maximumFractionDigits,
  }).format(converted);
}

export function formatCurrencyWithEstimate(
  usdAmount: number,
  currency: AppCurrency,
  showEstimate: boolean,
  options?: {
    compact?: boolean;
    maximumFractionDigits?: number;
  },
) {
  return {
    primary: formatCurrencyAmount(usdAmount, currency, options),
    secondary:
      showEstimate && currency !== "USD"
        ? `Base USD ${formatCurrencyAmount(usdAmount, "USD", options)}`
        : null,
  };
}

export function formatPercent(value: number, maximumFractionDigits = 1) {
  return `${new Intl.NumberFormat("en-US", {
    maximumFractionDigits,
    minimumFractionDigits: 0,
  }).format(value)}%`;
}

export function parseUsdCurrencyString(value: string) {
  return Number(value.replace(/[$,]/g, ""));
}
