"use client";

import { AlertTriangle, Bell, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface Alert {
  name: string;
  state: string;
  activeAt?: string;
  severity?: string;
  component?: string;
  summary?: string;
}

interface AlertsPanelProps {
  firing: Alert[];
  pending: Alert[];
}

function formatDuration(since: string): string {
  const ms = Date.now() - new Date(since).getTime();
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

const severityBadge: Record<string, string> = {
  critical: "bg-destructive/20 text-destructive",
  warning: "bg-warning/20 text-warning",
  info: "bg-chart-1/20 text-chart-1",
};

function AlertRow({ alert, variant }: { alert: Alert; variant: "firing" | "pending" }) {
  const isFiring = variant === "firing";
  const sev = alert.severity ?? (isFiring ? "warning" : "info");

  return (
    <div
      className={cn(
        "rounded-lg border px-4 py-3",
        isFiring
          ? "border-destructive/30 bg-destructive/5"
          : "border-warning/30 bg-warning/5"
      )}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle
          className={cn(
            "mt-0.5 h-4 w-4 flex-shrink-0",
            isFiring ? "text-destructive" : "text-warning"
          )}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p
              className={cn(
                "text-sm font-semibold",
                isFiring ? "text-destructive" : "text-warning"
              )}
            >
              {alert.name}
            </p>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider",
                severityBadge[sev] ?? severityBadge.info
              )}
            >
              {sev}
            </span>
          </div>
          {alert.summary && (
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              {alert.summary}
            </p>
          )}
          <div className="mt-2 flex items-center gap-4 text-[11px] text-muted-foreground">
            {alert.component && <span>Component: {alert.component}</span>}
            {alert.activeAt && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDuration(alert.activeAt)} ago
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function AlertsPanel({ firing, pending }: AlertsPanelProps) {
  const hasAlerts = firing.length > 0 || pending.length > 0;

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Bell className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-medium text-card-foreground">Active Alerts</h3>
        {firing.length > 0 && (
          <span className="ml-auto rounded-full bg-destructive/20 px-2.5 py-0.5 text-xs font-medium text-destructive">
            {firing.length} firing
          </span>
        )}
        {pending.length > 0 && (
          <span
            className={cn(
              "rounded-full bg-warning/20 px-2.5 py-0.5 text-xs font-medium text-warning",
              firing.length === 0 && "ml-auto"
            )}
          >
            {pending.length} pending
          </span>
        )}
      </div>

      {!hasAlerts ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          All clear — no active alerts
        </p>
      ) : (
        <div className="space-y-3">
          {firing.map((alert, i) => (
            <AlertRow key={`f-${i}`} alert={alert} variant="firing" />
          ))}
          {pending.map((alert, i) => (
            <AlertRow key={`p-${i}`} alert={alert} variant="pending" />
          ))}
        </div>
      )}
    </div>
  );
}
