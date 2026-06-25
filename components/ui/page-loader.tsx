import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

function LoaderCanvas({
  children,
  maxWidth = "max-w-7xl",
  className,
}: {
  children: ReactNode;
  maxWidth?: string;
  className?: string;
}) {
  return (
    <div className={cn("px-6 py-8", className)}>
      <div className={`mx-auto w-full ${maxWidth}`}>{children}</div>
    </div>
  );
}

function MetricSkeletonGrid({
  count = 4,
  className,
  itemClassName = "h-28 rounded-[1.75rem]",
}: {
  count?: number;
  className?: string;
  itemClassName?: string;
}) {
  return (
    <div className={cn("grid gap-4 md:grid-cols-4", className)}>
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton key={index} className={itemClassName} />
      ))}
    </div>
  );
}

export function TeamPageContentLoader() {
  return (
    <div className="space-y-4">
      <MetricSkeletonGrid />
      <Skeleton className="h-40 rounded-[2rem]" />
      <Skeleton className="h-72 rounded-[2rem]" />
    </div>
  );
}

export function PageHeaderSkeleton({
  compact = false,
}: {
  compact?: boolean;
}) {
  return (
    <div className="space-y-3">
      <Skeleton
        className={cn(
          "max-w-[24rem] rounded-[1rem]",
          compact ? "h-10" : "h-12",
        )}
      />
      <Skeleton
        className={cn(
          "max-w-[36rem] rounded-full",
          compact ? "h-4" : "h-5",
        )}
      />
    </div>
  );
}

export function EventsPageContentLoader() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <MetricSkeletonGrid itemClassName="h-24 rounded-[1.75rem]" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-28 rounded-[1.75rem]" />
          <Skeleton className="h-28 rounded-[1.75rem]" />
        </div>
      </div>
      <Skeleton className="h-12 w-full max-w-[38rem] rounded-[1.35rem]" />
      <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-[360px] rounded-[2rem]" />
        ))}
      </div>
    </div>
  );
}

export function RootPageLoader() {
  return (
    <div className="min-h-screen">
      <LoaderCanvas maxWidth="max-w-5xl" className="py-10">
        <div className="space-y-4">
          <Skeleton className="h-24 rounded-[2rem]" />
          <MetricSkeletonGrid />
          <Skeleton className="h-72 rounded-[2rem]" />
        </div>
      </LoaderCanvas>
    </div>
  );
}

export function DashboardPageLoader() {
  return (
    <LoaderCanvas>
      <div className="space-y-4">
        <Skeleton className="h-24 rounded-[2rem]" />
        <MetricSkeletonGrid />
        <Skeleton className="h-36 rounded-[2rem]" />
        <div className="grid gap-4 xl:grid-cols-[1.35fr_0.85fr]">
          <Skeleton className="h-[22rem] rounded-[2rem]" />
          <Skeleton className="h-[22rem] rounded-[2rem]" />
        </div>
        <div className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
          <Skeleton className="h-[24rem] rounded-[2rem]" />
          <Skeleton className="h-[24rem] rounded-[2rem]" />
        </div>
      </div>
    </LoaderCanvas>
  );
}

export function EventWorkspaceLoader({
  variant,
}: {
  variant: "overview" | "dashboard" | "budget" | "expenses" | "team" | "tasks";
}) {
  if (variant === "overview") {
    return (
      <LoaderCanvas>
        <div className="space-y-4">
          <Skeleton className="h-20 rounded-[1.75rem]" />
          <Skeleton className="h-[21rem] rounded-[2rem]" />
          <div className="grid gap-4 lg:grid-cols-3">
            <Skeleton className="h-32 rounded-[1.75rem]" />
            <Skeleton className="h-32 rounded-[1.75rem]" />
            <Skeleton className="h-32 rounded-[1.75rem]" />
          </div>
        </div>
      </LoaderCanvas>
    );
  }

  if (variant === "dashboard") {
    return <DashboardPageLoader />;
  }

  if (variant === "budget") {
    return (
      <LoaderCanvas>
        <div className="space-y-4">
          <Skeleton className="h-24 rounded-[2rem]" />
          <MetricSkeletonGrid itemClassName="h-[5.4rem] rounded-[1.75rem]" />
          <Skeleton className="h-[34rem] rounded-[2rem]" />
        </div>
      </LoaderCanvas>
    );
  }

  if (variant === "team") {
    return (
      <LoaderCanvas>
        <div className="space-y-4">
          <Skeleton className="h-24 rounded-[2rem]" />
          <MetricSkeletonGrid />
          <Skeleton className="h-40 rounded-[2rem]" />
          <Skeleton className="h-72 rounded-[2rem]" />
        </div>
      </LoaderCanvas>
    );
  }

  if (variant === "tasks") {
    return (
      <LoaderCanvas>
        <div className="space-y-4">
          <Skeleton className="h-24 rounded-[2rem]" />
          <MetricSkeletonGrid itemClassName="h-[5.4rem] rounded-[1.75rem]" />
          <Skeleton className="h-[5.5rem] rounded-[1.75rem]" />
          <Skeleton className="h-[34rem] rounded-[2rem]" />
        </div>
      </LoaderCanvas>
    );
  }

  return (
    <LoaderCanvas>
      <div className="space-y-4">
        <Skeleton className="h-24 rounded-[2rem]" />
        <MetricSkeletonGrid itemClassName="h-[5.4rem] rounded-[1.75rem]" />
        <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
          <Skeleton className="h-[40rem] rounded-[2rem]" />
          <Skeleton className="h-[40rem] rounded-[2rem]" />
        </div>
      </div>
    </LoaderCanvas>
  );
}
