const fallbackFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export const formatCurrency = (
  valueInCents: number,
  currency: string = "USD",
) => {
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  });

  return formatter.format(valueInCents / 100);
};

export const parseCurrencyInputToCents = (value: string) => {
  const normalized = value.replace(/[^\d.-]/g, "");
  const amount = Number.parseFloat(normalized);

  if (Number.isNaN(amount)) {
    return 0;
  }

  return Math.round(amount * 100);
};

export const formatCurrencyInput = (valueInCents: number) =>
  valueInCents ? (valueInCents / 100).toFixed(2) : "";

export const safeCurrency = (valueInCents: number, currency?: string | null) => {
  if (!currency) {
    return fallbackFormatter.format(valueInCents / 100);
  }

  return formatCurrency(valueInCents, currency);
};
