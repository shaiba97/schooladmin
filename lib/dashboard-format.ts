/**
 * Formatting helpers shared by the main admin dashboard widgets.
 * Currency defaults to SDG, mirroring the financial dashboard conventions.
 */

const currencyFormatters = new Map<string, Intl.NumberFormat>();

function safeCurrencyCode(code: string | null | undefined) {
  const normalized = String(code ?? "").toUpperCase();
  return /^[A-Z]{3}$/.test(normalized) ? normalized : "SDG";
}

export function formatMoney(value: number, currency: string) {
  const amount = Number.isFinite(value) ? value : 0;
  const code = safeCurrencyCode(currency);

  let formatter = currencyFormatters.get(code);
  if (!formatter) {
    try {
      formatter = new Intl.NumberFormat("en-GB", {
        style: "currency",
        currency: code,
        currencyDisplay: "narrowSymbol",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    } catch {
      formatter = new Intl.NumberFormat("en-GB", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }
    currencyFormatters.set(code, formatter);
  }

  return formatter.format(amount);
}

export function formatCompactMoney(value: number, currency: string) {
  const amount = Number.isFinite(value) ? value : 0;
  const code = safeCurrencyCode(currency);

  let formatter = currencyFormatters.get(`compact:${code}`);
  if (!formatter) {
    try {
      formatter = new Intl.NumberFormat("en-GB", {
        style: "currency",
        currency: code,
        currencyDisplay: "narrowSymbol",
        notation: "compact",
        maximumFractionDigits: 1,
      } as Intl.NumberFormatOptions);
    } catch {
      formatter = new Intl.NumberFormat("en-GB", {
        notation: "compact",
        maximumFractionDigits: 1,
      });
    }
    currencyFormatters.set(`compact:${code}`, formatter);
  }

  return formatter.format(amount);
}

export function pickPrimaryCurrency(
  payments: { currencyCode: string }[],
  expenses: { currencyCode: string }[],
  payouts: { currencyCode: string }[],
) {
  const counts = new Map<string, number>();
  for (const [code] of [
    ...payments.map((row) => [row.currencyCode] as const),
    ...expenses.map((row) => [row.currencyCode] as const),
    ...payouts.map((row) => [row.currencyCode] as const),
  ]) {
    const normalized = String(code ?? "").toUpperCase();
    if (/^[A-Z]{3}$/.test(normalized)) {
      counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
    }
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "SDG";
}

export function monthKeyOf(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

const MONTH_YEAR_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  timeZone: "UTC",
});

export function lastMonthBuckets(count: number) {
  const now = new Date();
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (count - 1) + index, 1),
    );
    return {
      key: `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`,
      label: MONTH_YEAR_FORMATTER.format(date),
    };
  });
}

export function formatPercent(value: number | null, signed = true) {
  if (value === null || !Number.isFinite(value)) return null;
  const digits = `${value.toLocaleString("en-GB", { maximumFractionDigits: 1 })}%`;
  if (!signed) return digits;
  return value >= 0 ? `+${digits}` : digits;
}
