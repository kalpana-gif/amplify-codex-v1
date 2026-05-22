"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUserProfile } from "@/lib/graphql/events";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    void getCurrentUserProfile().then((profile) => {
      router.replace(profile ? "/events" : "/login");
    });
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-lg rounded-[32px] border border-slate-200/80 bg-white/90 px-8 py-10 text-center shadow-[var(--shadow-panel-strong)] backdrop-blur-md">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.75rem] bg-[linear-gradient(135deg,var(--color-primary),var(--color-accent))] text-lg font-semibold text-white">
          EM
        </div>
        <p className="mt-6 text-xs uppercase tracking-[0.28em] text-slate-500">
          Event Management Budgeting System
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
          Loading your command center
        </h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          Checking your session and routing you to the right workspace.
        </p>
        <div className="mt-8 h-2 overflow-hidden rounded-full bg-slate-200">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-[linear-gradient(90deg,var(--color-primary),var(--color-accent))]" />
        </div>
      </div>
    </div>
  );
}
