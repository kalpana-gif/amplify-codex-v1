"use client";

import { useState } from "react";
import { AuthGuard } from "@/components/layout/auth-guard";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { cn } from "@/lib/utils";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <AuthGuard>
      <div
        className={cn(
          "min-h-screen md:grid",
          sidebarCollapsed
            ? "md:grid-cols-[96px_minmax(0,1fr)]"
            : "md:grid-cols-[308px_minmax(0,1fr)]",
        )}
      >
        <Sidebar
          open={sidebarOpen}
          collapsed={sidebarCollapsed}
          onClose={() => setSidebarOpen(false)}
        />
        <main className="px-4 py-4 md:px-7 md:py-7">
          <Header
            sidebarCollapsed={sidebarCollapsed}
            onOpenSidebar={() => setSidebarOpen(true)}
            onToggleSidebarCollapse={() =>
              setSidebarCollapsed((current) => !current)
            }
          />
          <div className="mt-6">{children}</div>
        </main>
      </div>
    </AuthGuard>
  );
}
