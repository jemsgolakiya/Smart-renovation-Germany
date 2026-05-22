import React from "react";
import { cn } from "../../utils/utils";
interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  className?: string;
}

export const Label: React.FC<LabelProps> = ({
  className,
  children,
  ...props
}) => (
  <label
    className={cn(
      "flex items-center gap-2 text-sm font-medium leading-none select-none peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
      className
    )}
    {...props}
  >
    {children}
  </label>
);
