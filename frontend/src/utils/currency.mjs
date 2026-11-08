// Requested illustrative inputs, NOT live exchange or Planet settlement quotes.
export const FX_REFERENCE = { label: 'Illustrative planning rates — not live', source: 'User-supplied planning examples, 24 Oct 2026' };
export const RATES = Object.freeze({ AED: 1, USD: 0.272, EUR: 0.250, GBP: 0.215, SAR: 1.021, INR: 22.85, CNY: 1.97 });
export function convertCurrency(amountAED, currency = 'AED') {
  const amount = Number(amountAED);
  if (!Object.hasOwn(RATES, currency) || !Number.isFinite(amount) || amount < 0) return null;
  return Math.round((amount * RATES[currency] + Number.EPSILON) * 100) / 100;
}
export function formatCurrency(amountAED, currency = 'AED') {
  const converted = convertCurrency(amountAED, currency);
  return converted === null ? 'Unavailable' : new Intl.NumberFormat('en', { style: 'currency', currency, currencyDisplay: 'code' }).format(converted);
}
