import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <div className="group relative w-full">
    <select
      ref={ref}
      className={cn(
        "peer h-11 w-full appearance-none rounded-[1rem] border border-slate-200/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.96))] px-4 pr-14 text-[15px] font-medium text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] outline-none transition-[border-color,box-shadow,background-color] duration-200 hover:border-slate-300 hover:bg-white focus:border-[var(--color-accent)] focus:bg-white focus:ring-4 focus:ring-[color-mix(in_srgb,var(--color-accent)_14%,transparent)] disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
      {...props}
    >
      {children}
    </select>
    <span
      aria-hidden="true"
      className="pointer-events-none absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200/90 bg-white/95 text-slate-500 shadow-[0_6px_16px_rgba(15,23,42,0.08)] transition-all duration-200 group-hover:scale-[1.03] group-hover:border-slate-300 group-hover:text-[var(--color-primary)] peer-focus:scale-[1.04] peer-focus:border-[rgba(46,117,182,0.22)] peer-focus:text-[var(--color-primary)] peer-focus:shadow-[0_0_0_4px_rgba(46,117,182,0.12),0_8px_20px_rgba(15,23,42,0.12)] peer-disabled:border-slate-200 peer-disabled:bg-slate-100 peer-disabled:text-slate-400 peer-disabled:shadow-none"
    >
      <ChevronDown className="h-4 w-4 transition-transform duration-200 group-hover:scale-110 peer-focus:scale-110" />
    </span>
  </div>
));

Select.displayName = "Select";
