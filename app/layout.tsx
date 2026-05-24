import type { Metadata } from "next";
import { BRANDING } from "@/config/branding.mjs";
import { AppProviders } from "@/components/providers/app-providers";
import "./globals.css";

export const metadata: Metadata = {
  title: BRANDING.appTitle,
  description: BRANDING.metadataDescription,
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
