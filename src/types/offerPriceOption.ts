export type PriceFrequency = 'per_month' | 'per_year' | 'lifetime' | 'one_time';

export interface OfferPriceOption {
  id?: string;
  amount: number;
  currency: string;
  frequency: PriceFrequency;
  sort_order: number;
}

export interface OfferPriceOptionRow extends OfferPriceOption {
  _tempId?: string; // For UI tracking before save
}

export function formatPriceOption(option: OfferPriceOption): string {
  const amount = typeof option.amount === 'number' ? option.amount : parseFloat(option.amount.toString());
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: option.currency || 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);

  const frequencyLabels: Record<PriceFrequency, string> = {
    per_month: '/ month',
    per_year: '/ year',
    lifetime: 'lifetime',
    one_time: 'one-time',
  };

  return `${formattedAmount} ${frequencyLabels[option.frequency] || ''}`.trim();
}

export function getFrequencyLabel(frequency: PriceFrequency): string {
  const labels: Record<PriceFrequency, string> = {
    per_month: 'Per month',
    per_year: 'Per year',
    lifetime: 'Lifetime',
    one_time: 'One-time',
  };
  return labels[frequency] || frequency;
}

