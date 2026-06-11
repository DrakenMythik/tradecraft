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
      <body className="min-h-screen font-sans text-slate-100 antialiased selection:bg-amberline/30 selection:text-white">
        {children}
      </body>
    </html>
  );
}
