"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Database,
  Zap,
  AlertTriangle,
  BarChart3,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Overview", icon: LayoutDashboard, color: "text-chart-1" },
  { href: "/kafka", label: "Kafka", icon: Database, color: "text-success" },
  { href: "/flink", label: "Flink", icon: Zap, color: "text-chart-4" },
  { href: "/dlq", label: "Dead Letter Queue", icon: AlertTriangle, color: "text-destructive" },
  { href: "/analytics", label: "Analytics", icon: BarChart3, color: "text-chart-2" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-card">
      <div className="flex h-16 items-center gap-2 border-b border-border px-6">
        <Activity className="h-6 w-6 text-chart-1" />
        <span className="text-lg font-semibold tracking-tight">
          Stream Monitor
        </span>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {links.map(({ href, label, icon: Icon, color }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className={cn("h-4 w-4", active ? color : "")} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
          Streaming Platform v1.0
        </div>
      </div>
    </aside>
  );
}
