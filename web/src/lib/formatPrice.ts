const aud = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' });

export const formatPrice = (amount: number): string => aud.format(amount);
