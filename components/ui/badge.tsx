import { cn } from "@/lib/utils";

const variants = {
  default: "border border-slate-200 bg-white text-slate-700",
  active: "border border-emerald-200 bg-emerald-50 text-emerald-700",
  draft: "border border-amber-200 bg-amber-50 text-amber-800",
  completed: "border border-sky-200 bg-sky-50 text-sky-800",
  archived: "border border-slate-200 bg-slate-100 text-slate-700",
  success: "border border-emerald-200 bg-emerald-50 text-emerald-700",
  warning: "border border-amber-200 bg-amber-50 text-amber-800",
  danger: "border border-red-200 bg-red-50 text-red-700",
};

export function Badge({
  className,
  variant = "default",
  children,
}: {
  className?: string;
  variant?: keyof typeof variants;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em]",
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
