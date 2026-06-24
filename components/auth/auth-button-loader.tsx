"use client";

import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

export function AuthButtonLoader({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn("auth-button-loader", className)}
      style={style}
    />
  );
}
