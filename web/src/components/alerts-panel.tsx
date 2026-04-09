"use client";

import { AlertTriangle, Bell } from "lucide-react";
import { cn } from "@/lib/utils";

interface Alert {
  name: string;
  state: string;
  activeAt?: string;
}

interface AlertsPanelProps {
  firing: Alert[];
  pending: Alert[];
}

export function AlertsPanel({ firing, pending }: AlertsPanelProps) {
  const hasAlerts = firing.length > 0 || pending.length > 0;

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Bell className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-medium text-card-foreground">Active Alerts</h3>
        {firing.length > 0 && (
          <span className="ml-auto rounded-full bg-destructive/20 px-2 py-0.5 text-xs font-medium text-destructive">
            {firing.length} firing
          </span>
        )}
      </div>

      {!hasAlerts ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          All clear — no active alerts
        </p>
      ) : (
        <div className="space-y-2">
          {firing.map((alert, i) => (
            <div
              key={`f-${i}`}
              className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2"
            >
              <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-destructive truncate">
                  {alert.name}
                </p>
                {alert.activeAt && (
                  <p className="text-xs text-muted-foreground">
                    Since {new Date(alert.activeAt).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          ))}
          {pending.map((alert, i) => (
            <div
              key={`p-${i}`}
              className={cn(
                "flex items-center gap-3 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2"
              )}
            >
              <AlertTriangle className="h-4 w-4 text-warning flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-warning truncate">
                  {alert.name}
                </p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
