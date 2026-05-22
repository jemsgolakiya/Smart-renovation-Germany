/**
 * Currency formatter for EUR
 */
const currencyFormatter = new Intl.NumberFormat("de-DE", {
	style: "currency",
	currency: "EUR",
});

/**
 * Formats a budget value as currency or returns "Not specified" if null
 */
export const formatBudget = (budget: number | null): string => {
	if (budget === null) return "Not specified";
	return currencyFormatter.format(budget);
};

