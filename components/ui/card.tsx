import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={cn(
        "rounded-[28px] border border-[var(--color-border)] bg-[var(--color-panel)] shadow-[var(--shadow-panel)] backdrop-blur-md",
        className,
      )}
    >
      {children}
    </div>
  );
}
