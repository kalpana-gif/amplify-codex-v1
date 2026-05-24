import type { Metadata } from "next";
import { AppProviders } from "@/components/providers/app-providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "EMBS Command Center",
  description: "Event budgeting, execution, reporting, and budget governance in one workspace.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="text-slate-950">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
