export function formatPrice(amount: number, currency: string): string {
  if (currency === 'XAF') {
    return `${amount.toLocaleString('fr-FR')} XAF`;
  }
  return `${(amount / 100).toFixed(2)} ${currency}`;
}
