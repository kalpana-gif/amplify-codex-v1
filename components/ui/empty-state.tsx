import { Calendar1Icon } from "lucide-react";
import { Card } from "@/components/ui/card";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <Card className="border-dashed border-slate-300/80 p-10 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-[linear-gradient(135deg,var(--color-primary),var(--color-accent))] text-white shadow-[0_18px_36px_rgba(30,58,95,0.22)]">
        <Calendar1Icon className="h-6 w-6" />
      </div>
      <h3 className="mt-6 text-xl font-semibold text-slate-950">{title}</h3>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-600">
        {description}
      </p>
      {action ? <div className="mt-6">{action}</div> : null}
    </Card>
  );
}
