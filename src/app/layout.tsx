import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Client Pulse",
  description: "Per-account intelligence reports for Sales & Customer Success.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
