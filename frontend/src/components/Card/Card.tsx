import React from "react";
import { cn } from "../../utils/utils";

// Card root component
export const Card = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <div
      className={cn(
        "bg-white text-gray-900 flex flex-col gap-6 rounded-xl border border-gray-200 shadow-sm",
        className
      )}
      {...props}
    />
  );
};

// Card Header component
export const CardHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <div
      className={cn(
        "grid grid-rows-[auto_auto] items-start gap-1.5 px-6 pt-6 pb-4",
        className
      )}
      {...props}
    />
  );
};

// Card Title component
export const CardTitle = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) => {
  return (
    <h4
      className={cn("text-xl font-bold leading-none", className)}
      {...props}
    />
  );
};

// Card Description component
export const CardDescription = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  return <p className={cn("text-gray-500", className)} {...props} />;
};

// Card Action component (optional)
export const CardAction = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <div
      className={cn(
        "col-start-2 row-span-2 self-start justify-self-end",
        className
      )}
      {...props}
    />
  );
};

// Card Content component
export const CardContent = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  return <div className={cn("px-6 py-6", className)} {...props} />;
};

// Card Footer component
export const CardFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <div
      className={cn(
        "flex items-center px-6 pb-6 pt-4 border-t border-gray-100",
        className
      )}
      {...props}
    />
  );
};
