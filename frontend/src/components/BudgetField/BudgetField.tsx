import React, {
	useMemo,
	useState,
	useCallback,
	useEffect,
	FocusEvent,
	ChangeEvent,
} from "react";

interface BudgetFieldProps {
	value: number | null;
	onChange: (value: number | null) => void;
	label?: string;
	id?: string;
	error?: string;
	placeholder?: string;
	className?: string;
}

const BudgetField: React.FC<BudgetFieldProps> = ({
	value,
	onChange,
	label = "Budget (EUR)",
	id = "budget",
	error,
	placeholder = "Enter budget amount",
	className,
}) => {
	const [displayValue, setDisplayValue] = useState("");
	const [isFocused, setIsFocused] = useState(false);

	const currencyFormatter = useMemo(
		() =>
			new Intl.NumberFormat("de-DE", {
				style: "currency",
				currency: "EUR",
			}),
		[]
	);

	const formatBudgetInputValue = useCallback(
		(budget: number | null): string => {
			if (budget === null) return "";
			return currencyFormatter.format(budget);
		},
		[currencyFormatter]
	);

	const parseBudgetInput = useCallback((rawValue: string): number | null => {
		const cleaned = rawValue.replace(/[^\d.,]/g, "");
		if (!cleaned) return null;

		const lastComma = cleaned.lastIndexOf(",");
		const lastDot = cleaned.lastIndexOf(".");
		const separatorIndex = Math.max(lastComma, lastDot);

		if (separatorIndex === -1) {
			const numeric = Number(cleaned.replace(/[^\d]/g, ""));
			return Number.isNaN(numeric) ? null : numeric;
		}

		const decimalSeparator = cleaned[separatorIndex];
		const integerDigits = cleaned.slice(0, separatorIndex).replace(/[^\d]/g, "");
		const fractionalDigits = cleaned.slice(separatorIndex + 1).replace(/[^\d]/g, "");

		if (
			fractionalDigits.length === 3 &&
			integerDigits !== "0" &&
			((decimalSeparator === "," && lastDot === -1) ||
				(decimalSeparator === "." && lastComma === -1))
		) {
			const numeric = Number(`${integerDigits}${fractionalDigits}`);
			return Number.isNaN(numeric) ? null : numeric;
		}

		const normalizedInteger = integerDigits || "0";
		const normalized =
			fractionalDigits.length > 0 ? `${normalizedInteger}.${fractionalDigits}` : normalizedInteger;

		const numeric = Number(normalized);
		return Number.isNaN(numeric) ? null : numeric;
	}, []);

	useEffect(() => {
		if (isFocused) return;
		setDisplayValue(formatBudgetInputValue(value));
	}, [value, isFocused, formatBudgetInputValue]);

	const handleFocus = useCallback(
		(event: FocusEvent<HTMLInputElement>) => {
			setIsFocused(true);
			setDisplayValue(value !== null ? String(value) : "");
			event.target.select();
		},
		[value]
	);

	const handleBlur = useCallback(
		(event: FocusEvent<HTMLInputElement>) => {
			setIsFocused(false);
			const parsed = parseBudgetInput(event.target.value);
			onChange(parsed);
			setDisplayValue(formatBudgetInputValue(parsed));
		},
		[formatBudgetInputValue, onChange, parseBudgetInput]
	);

	const handleChange = useCallback(
		(event: ChangeEvent<HTMLInputElement>) => {
			const { value: inputValue } = event.target;
			setDisplayValue(inputValue);
			const parsed = parseBudgetInput(inputValue);
			onChange(parsed);
		},
		[onChange, parseBudgetInput]
	);

	return (
		<div className={className}>
			<label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
				{label}
			</label>
			<input
				type="text"
				id={id}
				inputMode="decimal"
				value={displayValue}
				onFocus={handleFocus}
				onBlur={handleBlur}
				onChange={handleChange}
				className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
					error ? "border-red-500" : "border-gray-300"
				}`}
				placeholder={placeholder}
			/>
			{error && <p className="mt-1 text-sm text-red-600">{error}</p>}
		</div>
	);
};

export default BudgetField;

