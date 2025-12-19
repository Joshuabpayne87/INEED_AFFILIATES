export function formatCurrency(value: string): string {
  if (!value) return '';

  // Remove all non-numeric characters except commas and periods
  const cleaned = value.replace(/[^\d.,]/g, '');

  // If it's empty after cleaning, return empty
  if (!cleaned) return '';

  // If it already has a dollar sign at the start, just return the value
  if (value.trim().startsWith('$')) return value;

  // Add dollar sign
  return `$${cleaned}`;
}

export function formatCurrencyInput(value: string): string {
  if (!value) return '';

  // Remove all existing dollar signs and spaces
  let cleaned = value.replace(/[$\s]/g, '');

  // If empty, return empty
  if (!cleaned) return '';

  // Check if it contains "/mo", "/month", "/yr", "/year" etc (subscription patterns)
  const hasSubscriptionSuffix = /\/(mo|month|yr|year|week|day)$/i.test(value);
  const subscriptionSuffix = hasSubscriptionSuffix ? value.match(/\/(mo|month|yr|year|week|day)$/i)?.[0] : '';

  // Remove the suffix for processing
  if (subscriptionSuffix) {
    cleaned = cleaned.replace(/\/(mo|month|yr|year|week|day)$/i, '');
  }

  // Remove all non-numeric characters except commas and periods
  cleaned = cleaned.replace(/[^\d.,]/g, '');

  // If empty after cleaning, return just the dollar sign
  if (!cleaned) return '$';

  // Add dollar sign and suffix back
  return `$${cleaned}${subscriptionSuffix || ''}`;
}

export function displayPrice(price: string | null | undefined): string {
  if (!price) return '-';

  // If already formatted with $, return as-is
  if (price.trim().startsWith('$')) return price;

  // Otherwise format it
  return formatCurrencyInput(price);
}
