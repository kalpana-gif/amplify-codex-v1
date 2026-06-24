"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { RootPageLoader } from "@/components/ui/page-loader";
import { getCurrentUserProfile } from "@/lib/graphql/events";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    void getCurrentUserProfile().then((profile) => {
      router.replace(profile ? "/events" : "/login");
    });
  }, [router]);

  return <RootPageLoader />;
}
