/**
 * Utility functions for the Financing module
 */

/**
 * Format number as Euro currency
 * @param amount - Number to format
 * @returns Formatted currency string (e.g., "€45,000")
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};
