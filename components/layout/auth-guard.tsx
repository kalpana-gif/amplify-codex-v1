"use client";

import { useEffect, useState, startTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getCurrentUserProfile } from "@/lib/graphql/events";
import { Skeleton } from "@/components/ui/skeleton";

export function AuthGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [status, setStatus] = useState<"checking" | "ready">("checking");

  useEffect(() => {
    startTransition(() => {
      void getCurrentUserProfile().then((profile) => {
        if (!profile) {
          router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
          return;
        }

        setStatus("ready");
      });
    });
  }, [pathname, router]);

  if (status === "checking") {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 w-full rounded-3xl" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
        <Skeleton className="h-80 w-full rounded-3xl" />
      </div>
    );
  }

  return children;
}
