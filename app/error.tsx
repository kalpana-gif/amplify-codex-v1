"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <Card className="max-w-lg p-8">
        <h1 className="text-2xl font-semibold text-slate-950">
          Something went wrong
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          The application hit an unexpected error while rendering this page.
        </p>
        <Button className="mt-6" onClick={reset}>
          Try again
        </Button>
      </Card>
    </div>
  );
}
