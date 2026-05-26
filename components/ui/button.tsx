import * as React from "react";
import { cn } from "@/lib/utils";

const buttonVariants = {
  primary:
    "bg-[linear-gradient(135deg,var(--color-primary),#16314f)] text-white shadow-[0_14px_28px_rgba(30,58,95,0.24)] hover:-translate-y-0.5 hover:shadow-[0_18px_32px_rgba(30,58,95,0.28)] disabled:bg-slate-300",
  auth:
    "group relative isolate overflow-hidden border border-[rgba(30,58,95,0.14)] bg-[linear-gradient(135deg,var(--color-primary),var(--color-accent))] text-white [text-shadow:1px_1px_1px_rgba(0,0,0,0.18)] shadow-[0_18px_38px_rgba(30,58,95,0.2)] hover:brightness-105 hover:shadow-[0_22px_42px_rgba(30,58,95,0.24)] disabled:border-slate-200 disabled:bg-slate-300 disabled:shadow-none disabled:[text-shadow:none]",
  secondary:
    "border border-slate-200 bg-white/90 text-[var(--color-primary)] hover:border-slate-300 hover:bg-white",
  ghost: "bg-transparent text-slate-700 hover:bg-slate-950/5",
  danger: "bg-[var(--color-danger)] text-white hover:bg-red-700",
};

const buttonSizes = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-sm",
  lg: "h-12 px-5 text-base",
};

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof buttonVariants;
  size?: keyof typeof buttonSizes;
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      type = "button",
      ...props
    },
    ref,
  ) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-flex items-center justify-center rounded-2xl font-medium transition disabled:cursor-not-allowed disabled:opacity-60",
        buttonVariants[variant],
        buttonSizes[size],
        className,
      )}
      {...props}
    />
  ),
);

Button.displayName = "Button";
