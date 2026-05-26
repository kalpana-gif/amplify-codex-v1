import { type ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function AuthFormShell({
  badge,
  title,
  description,
  helper,
  children,
  footer,
  className,
}: {
  badge: ReactNode;
  title: string;
  description: string;
  helper?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <Card
      className={cn(
        "relative flex min-h-[39rem] flex-col overflow-hidden rounded-[1.9rem] border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(247,250,252,0.95))] p-5 shadow-[0_24px_80px_rgba(15,23,42,0.08)] sm:min-h-[40rem] sm:rounded-[2.1rem] sm:p-6 lg:min-h-[42rem] lg:p-5 xl:min-h-[42rem] xl:p-7",
        className,
      )}
    >
      <span className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top,rgba(46,117,182,0.14),transparent_70%)] sm:h-28" />
      <span className="pointer-events-none absolute -right-10 top-8 h-24 w-24 rounded-full bg-[radial-gradient(circle_at_center,rgba(22,49,79,0.1),transparent_72%)] sm:top-10 sm:h-28 sm:w-28" />

      <div className="relative flex flex-1 flex-col">
        <div className="flex items-start justify-between gap-4">
          <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-slate-200/80 bg-white/88 px-2.5 py-1.5 shadow-[0_8px_20px_rgba(15,23,42,0.05)]">
            {badge}
          </div>
        </div>

        <div className="mt-4 min-h-[7.5rem] sm:mt-5 sm:min-h-[8rem] lg:mt-4 xl:mt-5">
          <h1 className="text-[1.9rem] font-semibold tracking-tight text-slate-950 sm:text-[2.1rem] lg:text-[1.8rem] xl:text-[2.1rem]">
            {title}
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600 sm:mt-2.5 sm:text-[0.96rem] sm:leading-6 lg:text-[0.94rem] xl:text-[0.96rem]">
            {description}
          </p>
        </div>

        <div className="mt-4 min-h-[5.25rem] sm:mt-5 lg:mt-4 xl:mt-5">
          {helper}
        </div>

        <div className="mt-3.5 flex-1 sm:mt-4 lg:mt-3.5 xl:mt-4">{children}</div>

        {footer ? <div className="mt-4 sm:mt-5 lg:mt-4 xl:mt-5">{footer}</div> : null}
      </div>
    </Card>
  );
}
