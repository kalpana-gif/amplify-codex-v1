import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <Card className="max-w-lg p-8 text-center">
        <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
          404
        </p>
        <h1 className="mt-4 text-3xl font-semibold text-slate-950">
          Page not found
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          The route you requested does not exist in this workspace.
        </p>
        <Link href="/events" className="mt-6 inline-flex">
          <Button>Go to events</Button>
        </Link>
      </Card>
    </div>
  );
}
