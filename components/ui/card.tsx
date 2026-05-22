import { cn } from "@/lib/utils";

export function Card({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-[28px] border border-[var(--color-border)] bg-[var(--color-panel)] shadow-[var(--shadow-panel)] backdrop-blur-md",
        className,
      )}
    >
      {children}
    </div>
  );
}
