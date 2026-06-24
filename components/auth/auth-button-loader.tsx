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
    >
      <span className="auth-button-loader__ring" />
      <span className="auth-button-loader__ring auth-button-loader__ring--delay" />
      <span className="auth-button-loader__orbit">
        <span className="auth-button-loader__dot" />
      </span>
      <span className="auth-button-loader__core" />
    </span>
  );
}
