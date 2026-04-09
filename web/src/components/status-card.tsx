import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatusCardProps {
  title: string;
  status: "healthy" | "degraded" | "down" | "loading";
  icon: LucideIcon;
  detail?: string;
}

const statusConfig = {
  healthy: { label: "Healthy", color: "bg-success", textColor: "text-success" },
  degraded: { label: "Degraded", color: "bg-warning", textColor: "text-warning" },
  down: { label: "Down", color: "bg-destructive", textColor: "text-destructive" },
  loading: { label: "Loading", color: "bg-muted-foreground", textColor: "text-muted-foreground" },
};

export function StatusCard({ title, status, icon: Icon, detail }: StatusCardProps) {
  const cfg = statusConfig[status];

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Icon className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-sm font-medium text-card-foreground">{title}</h3>
        </div>
        <div className="flex items-center gap-2">
          <div className={cn("h-2.5 w-2.5 rounded-full", cfg.color)} />
          <span className={cn("text-xs font-medium", cfg.textColor)}>
            {cfg.label}
          </span>
        </div>
      </div>
      {detail && (
        <p className="mt-2 text-xs text-muted-foreground">{detail}</p>
      )}
    </div>
  );
}
