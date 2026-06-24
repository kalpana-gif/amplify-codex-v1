import { cn } from "@/lib/utils";

export function PageWrapper({
  title,
  description,
  actions,
  headerContent,
  children,
  className,
  compact = false,
  actionsPosition = "end",
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  headerContent?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  compact?: boolean;
  actionsPosition?: "end" | "center";
}) {
  return (
    <section className={cn(compact ? "space-y-4" : "space-y-6", className)}>
      <div
        className={cn(
          "border border-slate-200/70 bg-white/70 shadow-[var(--shadow-panel)] backdrop-blur-sm",
          compact ? "rounded-[1.75rem] p-5" : "rounded-[2rem] p-6",
        )}
      >
        <div
          className={cn(
            "flex flex-col md:flex-row md:justify-between",
            compact
              ? "gap-4 md:items-center"
              : actionsPosition === "center"
                ? "gap-5 md:items-center"
                : "gap-5 md:items-end",
          )}
        >
          <div>
            {headerContent ? (
              headerContent
            ) : (
              <>
                <h1
                  className={cn(
                    "font-semibold tracking-tight text-slate-950",
                    compact ? "text-3xl" : "text-4xl",
                  )}
                >
                  {title}
                </h1>
                {description ? (
                  <p
                    className={cn(
                      "max-w-3xl text-sm text-slate-600",
                      compact ? "mt-2 leading-6" : "mt-3 leading-7",
                    )}
                  >
                    {description}
                  </p>
                ) : null}
              </>
            )}
          </div>
          {actions ? <div className="flex items-center gap-3">{actions}</div> : null}
        </div>
      </div>
      {children}
    </section>
  );
}
