"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function DashboardError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <Card className="p-8">
      <h1 className="text-2xl font-semibold text-slate-950">
        Dashboard section failed
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        Try rendering the route again. If the issue persists, verify your
        Amplify outputs and authentication setup.
      </p>
      <Button className="mt-6" onClick={reset}>
        Retry
      </Button>
    </Card>
  );
}
