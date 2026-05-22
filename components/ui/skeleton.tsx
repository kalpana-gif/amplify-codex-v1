import { cn } from "@/lib/utils";

export function Skeleton({
  className,
}: {
  className?: string;
}) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-[24px] border border-white/60 bg-[linear-gradient(135deg,rgba(226,232,240,0.82),rgba(241,245,249,0.92))]",
        className,
      )}
    />
  );
}
