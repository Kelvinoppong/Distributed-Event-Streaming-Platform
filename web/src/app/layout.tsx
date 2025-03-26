import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Stream Monitor — Distributed Event Streaming Platform",
  description:
    "Real-time monitoring dashboard for Kafka, Flink, and DLQ pipelines",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isDemo = !process.env.PROMETHEUS_URL || process.env.PROMETHEUS_URL === "";

  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased bg-background text-foreground`}
      >
        <Sidebar />
        <main className="ml-64 min-h-screen p-8">
          {isDemo && (
            <div className="mb-6 flex items-center gap-2 rounded-lg border border-chart-1/30 bg-chart-1/5 px-4 py-2.5">
              <div className="h-2 w-2 rounded-full bg-chart-1 animate-pulse" />
              <p className="text-xs text-chart-1 font-medium">
                Demo Mode — Simulated metrics. Connect Kafka, Flink &amp; Prometheus for live data.
              </p>
            </div>
          )}
          {children}
        </main>
      </body>
    </html>
  );
}
