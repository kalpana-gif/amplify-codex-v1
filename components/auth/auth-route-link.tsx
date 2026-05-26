"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import {
  setAuthTransitionIntent,
  type AuthTransitionIntent,
} from "@/components/auth/auth-transition-intent";

type AuthRouteLinkProps = Omit<ComponentProps<typeof Link>, "onClick"> & {
  intent: Exclude<AuthTransitionIntent, null>;
  onClick?: ComponentProps<typeof Link>["onClick"];
};

export function AuthRouteLink({
  intent,
  onClick,
  ...props
}: AuthRouteLinkProps) {
  return (
    <Link
      {...props}
      onClick={(event) => {
        setAuthTransitionIntent(intent);
        onClick?.(event);
      }}
    />
  );
}
