import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Amplify Gen 2 + Next.js MVP",
  description: "REST /hello + GraphQL Todo demo",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
