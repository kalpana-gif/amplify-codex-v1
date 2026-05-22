import { Badge } from "@/components/ui/badge";
import type { EventStatus as EventStatusValue } from "@/types";

export function EventStatus({ status }: { status: EventStatusValue }) {
  const variant =
    status === "ACTIVE"
      ? "active"
      : status === "DRAFT"
        ? "draft"
        : status === "COMPLETED"
          ? "completed"
          : "archived";

  return <Badge variant={variant}>{status}</Badge>;
}
