import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function AuthField({
  label,
  error,
  children,
  hint,
}: {
  label: string;
  error?: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="block space-y-2">
      <span className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        {hint ? (
          <span className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
            {hint}
          </span>
        ) : null}
      </span>
      {children}
      <span
        className={cn(
          "block min-h-4 text-[11px] sm:text-xs",
          error ? "text-red-500" : "text-transparent",
        )}
      >
        {error ?? "."}
      </span>
    </label>
  );
}
