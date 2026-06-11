import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tradecraft Backtester",
  description: "Historical stock strategy builder and FastAPI backtesting engine."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
