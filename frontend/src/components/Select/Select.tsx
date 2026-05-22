import * as React from "react";
import { ChevronDownIcon, CheckIcon } from "lucide-react";
import { cn } from "../../utils/utils";

interface Option {
  value: string;
  label: string;
}

interface SelectProps {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  options: Option[];
  placeholder?: string;
  className?: string;
}

export function Select({
  value,
  defaultValue,
  onChange,
  options,
  placeholder = "Select an option",
  className,
}: SelectProps) {
  const [open, setOpen] = React.useState(false);
  const current =
    options.find((opt) => opt.value === value) ||
    options.find((opt) => opt.value === defaultValue);

  return (
    <div className={cn("relative w-full", className)}>
      <button
        type="button"
        className={cn(
          "flex w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:ring-2 focus:ring-emerald-400 disabled:cursor-not-allowed disabled:opacity-50",
          open && "ring-2 ring-emerald-400"
        )}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span>
          {current?.label || (
            <span className="text-gray-400">{placeholder}</span>
          )}
        </span>
        <ChevronDownIcon className="w-4 h-4 opacity-50" />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-gray-200 bg-white p-1 shadow-lg">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              className={cn(
                "relative flex w-full cursor-pointer items-center rounded-sm px-2 py-1.5 text-sm text-gray-900 hover:bg-emerald-50 hover:text-emerald-700 focus:bg-emerald-50 focus:text-emerald-700",
                value === option.value && "bg-emerald-50 text-emerald-700"
              )}
              onClick={() => {
                onChange?.(option.value);
                setOpen(false);
              }}
            >
              <span>{option.label}</span>
              {value === option.value && (
                <CheckIcon className="w-4 h-4 text-emerald-600 absolute right-2" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
