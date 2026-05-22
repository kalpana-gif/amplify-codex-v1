import { EventNavigation } from "@/components/events/event-navigation";

export default function EventWorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <EventNavigation />
      {children}
    </div>
  );
}
