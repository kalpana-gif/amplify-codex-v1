"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type BudgetActionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: ReactNode;
  label: ReactNode;
};

export function BudgetActionButton({
  className,
  icon,
  label,
  ...props
}: BudgetActionButtonProps) {
  return (
    <Button
      className={cn(
        "group relative h-11 rounded-full pl-5 pr-[3.35rem] text-white active:scale-[0.99]",
        className,
      )}
      variant="auth"
      {...props}
    >
      <span className="text-sm font-semibold tracking-[0.01em]">{label}</span>
      <span className="pointer-events-none absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center">
        <span className="absolute inset-0 rounded-full border border-white/24 opacity-0 transition-all duration-300 group-hover:scale-[1.16] group-hover:opacity-100" />
        <span className="absolute -inset-[4px] rounded-full border border-white/18 opacity-0 transition-all duration-300 group-hover:scale-[1.3] group-hover:opacity-100" />
        <span className="absolute -inset-[8px] rounded-full border border-white/12 opacity-0 transition-all duration-300 group-hover:scale-[1.44] group-hover:opacity-100" />
        <span className="relative flex h-9 w-9 items-center justify-center rounded-full border border-white/60 bg-white/95 text-[var(--color-primary)] shadow-[0_8px_18px_rgba(15,23,42,0.16)] transition-all duration-300 group-hover:scale-[1.08] group-hover:shadow-[0_12px_28px_rgba(15,23,42,0.22)]">
          {icon}
        </span>
      </span>
    </Button>
  );
}
