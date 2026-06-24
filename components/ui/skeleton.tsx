import { cn } from "@/lib/utils";

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[24px] border border-white/60 bg-[linear-gradient(135deg,rgba(226,232,240,0.82),rgba(241,245,249,0.92))] before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.25s_ease-out_infinite] before:bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.78),transparent)]",
        className,
      )}
      {...props}
    />
  );
}
