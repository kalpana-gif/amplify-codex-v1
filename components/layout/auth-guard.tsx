"use client";

import { useEffect, useState, startTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { TeamPageContentLoader } from "@/components/ui/page-loader";
import {
  getCurrentUserProfile,
  syncCurrentUserDirectoryProfile,
} from "@/lib/graphql/events";

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

        void syncCurrentUserDirectoryProfile(profile);
        setStatus("ready");
      });
    });
  }, [pathname, router]);

  if (status === "checking") {
    return <TeamPageContentLoader />;
  }

  return children;
}
