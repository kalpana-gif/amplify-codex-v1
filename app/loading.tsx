import { Skeleton } from "@/components/ui/skeleton";

export default function RootLoading() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-6 py-8">
      <Skeleton className="h-24 w-full rounded-3xl" />
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
      <Skeleton className="h-96 w-full rounded-3xl" />
    </div>
  );
}
