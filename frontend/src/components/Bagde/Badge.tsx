import React from "react";
import { cn } from "../../utils/utils";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {}

export const Badge = ({ className, ...props }: BadgeProps) => {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 gap-1 transition overflow-hidden",
        className
      )}
      {...props}
    />
  );
};
