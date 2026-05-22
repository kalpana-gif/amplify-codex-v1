"use client";

import { useEffect } from "react";
import { Toaster } from "react-hot-toast";
import { configureAmplifyClient } from "@/lib/amplify-client";

export function AppProviders({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    configureAmplifyClient();
  }, []);

  return (
    <>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          className:
            "rounded-[22px] border border-slate-200/80 bg-white/95 text-slate-900 shadow-[var(--shadow-panel)] backdrop-blur-md",
        }}
      />
    </>
  );
}
