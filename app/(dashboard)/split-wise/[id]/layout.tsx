import { SplitwiseNavigation } from "@/components/splitwise/splitwise-navigation";
import { SplitwiseWorkspaceProvider } from "@/components/splitwise/splitwise-workspace-provider";

export const dynamic = "force-dynamic";

export default function SplitwiseWorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SplitwiseWorkspaceProvider>
      <div className="space-y-6">
        <SplitwiseNavigation />
        {children}
      </div>
    </SplitwiseWorkspaceProvider>
  );
}
