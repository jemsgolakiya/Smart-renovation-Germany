import React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { cn } from "../../utils/utils";

type AvatarProps = {
  initials?: string;
  children?: React.ReactNode;
};

export function Avatar({ initials, children }: AvatarProps) {
  if (children) {
    return (
      <AvatarPrimitive.Root className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 font-semibold">
        {children}
      </AvatarPrimitive.Root>
    );
  }

  return (
    <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 font-semibold">
      {initials}
    </span>
  );
}

export function AvatarImage({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Image>) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn("aspect-square size-full", className)}
      {...props}
    />
  );
}

export function AvatarFallback({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        "bg-muted flex size-full items-center justify-center rounded-full",
        className,
      )}
      {...props}
    />
  );
}