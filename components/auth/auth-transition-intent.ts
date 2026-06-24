"use client";

export type AuthTransitionIntent = "to-login" | "to-register" | null;

let pendingAuthTransition: AuthTransitionIntent = null;

export const setAuthTransitionIntent = (intent: Exclude<AuthTransitionIntent, null>) => {
  pendingAuthTransition = intent;
};

export const peekAuthTransitionIntent = () => pendingAuthTransition;

export const clearAuthTransitionIntent = () => {
  pendingAuthTransition = null;
};
