import React from "react";
import { cn } from "../../utils/utils";

type ButtonVariant = "primary";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "py-2 bg-emerald-600 hover:bg-emerald-700 text-white",
};

export function Button({
  className,
  variant = "primary",
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md px-4 font-medium transition-all focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:opacity-50 disabled:pointer-events-none",
        VARIANT_CLASSES[variant],
        className
      )}
      {...props}
    />
  );
}
